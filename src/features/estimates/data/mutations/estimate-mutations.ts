"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/shared/lib/prisma";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveEstimateContext } from "../context/estimate-context";
import { estimateRepository } from "../../infrastructure/repositories/prisma-estimate-repository";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { salesSettingsRepository } from "@/features/sales-settings";
import { billingSettingsRepository } from "@/features/billing-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import type {
  Estimate,
  EstimateLineItem,
  EstimateStatus,
} from "../../domain/entities/estimate";
import {
  calculateEstimateTotals,
  lineTax,
  lineTaxable,
} from "../../domain/rules/estimate-rules";
import {
  canAcceptEstimate,
  canCancelEstimate,
  canConvertToInvoice,
  canDeleteEstimate,
  canEditEstimate,
  canRejectEstimate,
  canReopenEstimate,
  canSendEstimate,
} from "../../domain/rules/estimate-lifecycle-rules";
import { calculateInvoiceTotals, determineTaxMode } from "@/features/invoices";
import {
  createEstimateSchema,
  updateEstimateSchema,
} from "../validators/estimate-schemas";
import type {
  CreateEstimateInputDto,
  EstimateActionResult,
  UpdateEstimateInputDto,
} from "../dto/estimate-dto";
import {
  EstimateImmutableError,
  EstimateNotFoundError,
  InvalidCustomerReferenceError,
  InvalidProductReferenceError,
  InvalidEstimateStatusTransitionError,
  UnauthorizedEstimateAccessError,
} from "../../domain/errors/estimate-errors";

/**
 * Verifies that every referenced product belongs to the calling organization.
 */
export const assertEstimateProductsInOrganization = async (
  organizationId: string,
  productIds: ReadonlyArray<string | null | undefined>,
): Promise<void> => {
  const ids = [...new Set(productIds.filter((id): id is string => Boolean(id)))];
  const results = await Promise.all(
    ids.map((id) => productRepository.findById(organizationId, id)),
  );
  results.forEach((product, idx) => {
    if (!product) {
      throw new InvalidProductReferenceError(ids[idx]);
    }
  });
};

export const createEstimateAction = async (
  input: CreateEstimateInputDto,
): Promise<EstimateActionResult<Estimate>> => {
  try {
    const parseResult = createEstimateSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const { organizationId } = await resolveEstimateContext();
    const data = parseResult.data;

    // Verify customer if customerId provided
    let verifiedCustomer = null;
    if (data.customerId) {
      verifiedCustomer = await customerRepository.findById(
        organizationId,
        data.customerId,
      );
      if (!verifiedCustomer) {
        throw new InvalidCustomerReferenceError(data.customerId);
      }
    }

    await assertEstimateProductsInOrganization(
      organizationId,
      data.items.map((it) => it.productId),
    );

    // Determine Tax Mode
    const supplierTax = await getSupplierTaxContext();
    const placeOfSupply =
      data.customerPlaceOfSupply ||
      verifiedCustomer?.placeOfSupply ||
      verifiedCustomer?.billingAddress.state ||
      "";

    const taxDecision = determineTaxMode({
      supplierState: supplierTax.state,
      supplierGstin: supplierTax.gstNumber,
      customerPlaceOfSupply: placeOfSupply,
      customerGstin: data.customerGstin || verifiedCustomer?.gstin,
      customerState: verifiedCustomer?.billingAddress.state,
      gstTreatment: verifiedCustomer?.gstTreatment,
    });
    const taxMode = taxDecision.taxMode;

    // Line items & calculations
    const domainItems: EstimateLineItem[] = data.items.map((it, idx) => ({
      id: it.id || `est-line-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
      productId: it.productId,
      item: it.item,
      description: it.description || "",
      hsnSac: it.hsnSac || undefined,
      unit: it.unit || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    }));

    const calculatedTotals = calculateEstimateTotals({
      items: domainItems,
      taxMode,
      additionalCharges: data.additionalCharges,
      additionalDiscount: data.additionalDiscount,
      additionalDiscountType: data.additionalDiscountType,
    });

    const repositoryItems = domainItems.map((it, idx) => {
      const taxable = lineTaxable(it);
      const taxAmt = lineTax(it);
      const lineTot = taxable + taxAmt;
      return {
        id: `est_item_${crypto.randomUUID()}`,
        productId: it.productId ?? null,
        item: it.item,
        description: it.description ?? null,
        hsnSac: it.hsnSac ?? null,
        unit: it.unit ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        taxableAmount: taxable,
        taxAmount: taxAmt,
        lineTotal: lineTot,
        sortOrder: idx,
      };
    });

    // Allocate the estimate sequence number and persist the estimate in a
    // single transaction so a failed write rolls back the allocation instead
    // of burning a document number.
    const prisma = getPrisma();
    const saved = await prisma.$transaction(async (tx) => {
      const allocated = await salesSettingsRepository.allocateNextNumber(
        organizationId,
        tx,
      );
      const estimateId = `est_${crypto.randomUUID()}`;

      return estimateRepository.create(
        {
          id: estimateId,
          organizationId,
          estimateNumber: allocated.allocatedNumber,
          customerId: data.customerId ?? null,
          customerName: data.customerName,
          customerEmail: data.customerEmail || null,
          customerAddress: data.customerAddress || null,
          customerGstin: data.customerGstin || null,
          customerPlaceOfSupply: placeOfSupply || null,
          referenceNumber: data.referenceNumber || null,
          issueDate: new Date(`${data.issueDate}T00:00:00.000Z`),
          validUntil: new Date(`${data.validUntil}T00:00:00.000Z`),
          status: data.status as EstimateStatus,
          taxMode,
          currency: "INR (₹)",
          subtotal: calculatedTotals.subtotal,
          lineDiscountTotal:
            calculatedTotals.discount -
            (calculatedTotals.additionalDiscount ?? 0),
          additionalDiscount: calculatedTotals.additionalDiscount ?? 0,
          additionalDiscountType: data.additionalDiscountType,
          additionalDiscountLabel: data.additionalDiscountLabel || null,
          additionalCharges: calculatedTotals.additionalCharges ?? 0,
          additionalChargesLabel: data.additionalChargesLabel || null,
          taxableAmount: calculatedTotals.taxable,
          cgst: calculatedTotals.cgst,
          sgst: calculatedTotals.sgst,
          igst: calculatedTotals.igst,
          totalTax: calculatedTotals.tax,
          total: calculatedTotals.total,
          notes: data.notes || null,
          terms: data.terms || null,
          items: repositoryItems,
        },
        tx,
      );
    });

    revalidatePath("/estimates");
    revalidatePath("/estimates/new");

    return {
      success: true,
      data: saved,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const updateEstimateAction = async (
  input: UpdateEstimateInputDto,
): Promise<EstimateActionResult<Estimate>> => {
  try {
    const parseResult = updateEstimateSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const { organizationId } = await resolveEstimateContext();
    const data = parseResult.data;

    const existing = await estimateRepository.findById(organizationId, data.id);
    if (!existing) {
      throw new EstimateNotFoundError(data.id);
    }

    if (!canEditEstimate(existing)) {
      throw new EstimateImmutableError(
        `Cannot edit estimate in "${existing.status}" status. Only draft estimates can be modified.`,
      );
    }

    let verifiedCustomer = null;
    if (data.customerId) {
      verifiedCustomer = await customerRepository.findById(
        organizationId,
        data.customerId,
      );
      if (!verifiedCustomer) {
        throw new InvalidCustomerReferenceError(data.customerId);
      }
    }

    await assertEstimateProductsInOrganization(
      organizationId,
      data.items.map((it) => it.productId),
    );

    const supplierTax = await getSupplierTaxContext();
    const placeOfSupply =
      data.customerPlaceOfSupply ||
      verifiedCustomer?.placeOfSupply ||
      verifiedCustomer?.billingAddress.state ||
      "";

    const taxDecision = determineTaxMode({
      supplierState: supplierTax.state,
      supplierGstin: supplierTax.gstNumber,
      customerPlaceOfSupply: placeOfSupply,
      customerGstin: data.customerGstin || verifiedCustomer?.gstin,
      customerState: verifiedCustomer?.billingAddress.state,
      gstTreatment: verifiedCustomer?.gstTreatment,
    });
    const taxMode = taxDecision.taxMode;

    const domainItems: EstimateLineItem[] = data.items.map((it, idx) => ({
      id: it.id || `est-line-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
      productId: it.productId,
      item: it.item,
      description: it.description || "",
      hsnSac: it.hsnSac || undefined,
      unit: it.unit || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    }));

    const calculatedTotals = calculateEstimateTotals({
      items: domainItems,
      taxMode,
      additionalCharges: data.additionalCharges,
      additionalDiscount: data.additionalDiscount,
      additionalDiscountType: data.additionalDiscountType,
    });

    const repositoryItems = domainItems.map((it, idx) => {
      const taxable = lineTaxable(it);
      const taxAmt = lineTax(it);
      const lineTot = taxable + taxAmt;
      return {
        id: `est_item_${crypto.randomUUID()}`,
        productId: it.productId ?? null,
        item: it.item,
        description: it.description ?? null,
        hsnSac: it.hsnSac ?? null,
        unit: it.unit ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        taxableAmount: taxable,
        taxAmount: taxAmt,
        lineTotal: lineTot,
        sortOrder: idx,
      };
    });

    const updated = await estimateRepository.update(organizationId, data.id, {
      id: data.id,
      organizationId,
      estimateNumber: existing.estimateNumber,
      customerId: data.customerId ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      customerGstin: data.customerGstin || null,
      customerPlaceOfSupply: placeOfSupply || null,
      referenceNumber: data.referenceNumber || null,
      issueDate: new Date(`${data.issueDate}T00:00:00.000Z`),
      validUntil: new Date(`${data.validUntil}T00:00:00.000Z`),
      status: existing.status,
      taxMode,
      currency: "INR (₹)",
      subtotal: calculatedTotals.subtotal,
      lineDiscountTotal:
        calculatedTotals.discount -
        (calculatedTotals.additionalDiscount ?? 0),
      additionalDiscount: calculatedTotals.additionalDiscount ?? 0,
      additionalDiscountType: data.additionalDiscountType,
      additionalDiscountLabel: data.additionalDiscountLabel || null,
      additionalCharges: calculatedTotals.additionalCharges ?? 0,
      additionalChargesLabel: data.additionalChargesLabel || null,
      taxableAmount: calculatedTotals.taxable,
      cgst: calculatedTotals.cgst,
      sgst: calculatedTotals.sgst,
      igst: calculatedTotals.igst,
      totalTax: calculatedTotals.tax,
      total: calculatedTotals.total,
      notes: data.notes || null,
      terms: data.terms || null,
      items: repositoryItems,
    });

    revalidatePath("/estimates");
    revalidatePath(`/estimates/${data.id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const transitionEstimateStatusAction = async (
  id: string,
  targetStatus: EstimateStatus,
): Promise<EstimateActionResult<Estimate>> => {
  try {
    const { organizationId } = await resolveEstimateContext();

    const existing = await estimateRepository.findById(organizationId, id);
    if (!existing) {
      throw new EstimateNotFoundError(id);
    }

    let isAllowed = false;
    switch (targetStatus) {
      case "Sent":
        isAllowed = canSendEstimate(existing);
        break;
      case "Accepted":
        isAllowed = canAcceptEstimate(existing);
        break;
      case "Rejected":
        isAllowed = canRejectEstimate(existing);
        break;
      case "Cancelled":
        isAllowed = canCancelEstimate(existing);
        break;
      case "Draft":
        isAllowed = canReopenEstimate(existing);
        break;
      default:
        isAllowed = false;
    }

    if (!isAllowed) {
      throw new InvalidEstimateStatusTransitionError(
        existing.status,
        targetStatus,
      );
    }

    const updated = await estimateRepository.updateStatus(
      organizationId,
      id,
      targetStatus,
    );

    revalidatePath("/estimates");
    revalidatePath(`/estimates/${id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const deleteEstimateAction = async (
  id: string,
): Promise<EstimateActionResult<{ id: string }>> => {
  try {
    const { organizationId, memberRole } = await resolveEstimateContext();

    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedEstimateAccessError(
        "Only organization owners or admins can delete estimates.",
      );
    }

    const existing = await estimateRepository.findById(organizationId, id);
    if (!existing) {
      throw new EstimateNotFoundError(id);
    }

    if (!canDeleteEstimate(existing)) {
      throw new InvalidEstimateStatusTransitionError(
        existing.status,
        "delete",
      );
    }

    const count = await estimateRepository.delete(organizationId, id);
    if (count === 0) {
      throw new InvalidEstimateStatusTransitionError(
        existing.status,
        "delete",
      );
    }

    revalidatePath("/estimates");

    return {
      success: true,
      data: { id },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export type ConvertEstimateResult = {
  estimate: Estimate;
  invoiceId: string;
  invoiceNumber: string;
};

/**
 * Converts an accepted or eligible estimate to a genuine sales invoice.
 * Atomically allocates an invoice sequence number from BillingSettings, creates the
 * Invoice and line items, updates the Estimate to CONVERTED with bidirectional linkage,
 * ensuring no duplicate conversion and safe transaction rollback on failure.
 */
export const convertEstimateToInvoiceAction = async (
  id: string,
): Promise<EstimateActionResult<ConvertEstimateResult>> => {
  try {
    const { organizationId } = await resolveEstimateContext();

    const existing = await estimateRepository.findById(organizationId, id);
    if (!existing) {
      throw new EstimateNotFoundError(id);
    }

    if (!canConvertToInvoice(existing)) {
      throw new InvalidEstimateStatusTransitionError(
        existing.status,
        "Converted to Invoice",
      );
    }

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch inside the transaction: conversion needs the full
      // persistence row (currency, customer snapshot, computed line values)
      // which the presentation-shaped domain Estimate intentionally omits.
      const freshEstimate = await tx.estimate.findUnique({
        where: {
          organizationId_estimateNumber: {
            organizationId,
            estimateNumber: existing.estimateNumber,
          },
        },
        include: { items: true },
      });

      if (!freshEstimate) {
        throw new EstimateNotFoundError(id);
      }

      if (freshEstimate.convertedToInvoiceId) {
        throw new Error(
          `This quotation has already been converted to invoice ${freshEstimate.convertedToInvoiceId}.`,
        );
      }

      // 1. Allocate genuine Invoice Number from Invoice Billing Settings
      const allocatedInvoice = await billingSettingsRepository.allocateNextNumber(
        organizationId,
        "INVOICE",
        tx,
      );
      const invoiceNumber = allocatedInvoice.allocatedNumber;
      const invoiceId = `inv_${crypto.randomUUID()}`;

      // 2. Prepare domain items and calculate authoritative invoice totals
      const invoiceLineItems = freshEstimate.items.map((it, idx) => ({
        id: `line-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
        item: it.item,
        description: it.description || "",
        hsnSac: it.hsnSac || undefined,
        unit: it.unit || undefined,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
        taxRate: Number(it.taxRate),
      }));

      const invoiceTotals = calculateInvoiceTotals({
        items: invoiceLineItems,
        amountPaid: 0,
        taxMode: (freshEstimate.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
        additionalCharges: Number(freshEstimate.additionalCharges) || 0,
        additionalDiscount: Number(freshEstimate.additionalDiscount) || 0,
        additionalDiscountType:
          (freshEstimate.additionalDiscountType as "percentage" | "fixed") ||
          "fixed",
      });

      // Issue date = today, due date = 15 days later by default
      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const invoiceItemInputs = freshEstimate.items.map((it, idx) => {
        const lineItem = invoiceLineItems[idx];
        const taxable = lineTaxable(lineItem);
        const taxAmt = lineTax(lineItem);
        return {
          id: `item_${crypto.randomUUID()}`,
          productId: it.productId ?? null,
          item: it.item,
          description: it.description ?? null,
          hsnSac: it.hsnSac ?? null,
          unit: it.unit ?? null,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discount: Number(it.discount),
          taxRate: Number(it.taxRate),
          taxableAmount: taxable,
          taxAmount: taxAmt,
          lineTotal: taxable + taxAmt,
          sortOrder: idx,
        };
      });

      // 3. Create the genuine Invoice record
      const createdInvoice = await invoiceRepository.create(
        {
          id: invoiceId,
          organizationId,
          invoiceNumber,
          customerId: freshEstimate.customerId ?? null,
          customerName: freshEstimate.customerName,
          customerEmail: freshEstimate.customerEmail ?? null,
          customerAddress: freshEstimate.customerAddress ?? null,
          customerGstin: freshEstimate.customerGstin ?? null,
          customerPlaceOfSupply: freshEstimate.customerPlaceOfSupply ?? null,
          issueDate,
          dueDate,
          paymentTerms: "Net 15 days",
          status: "Draft",
          taxMode: freshEstimate.taxMode,
          currency: freshEstimate.currency,
          subtotal: invoiceTotals.subtotal,
          lineDiscountTotal:
            invoiceTotals.discount - (invoiceTotals.additionalDiscount ?? 0),
          additionalDiscount: invoiceTotals.additionalDiscount ?? 0,
          additionalDiscountType: freshEstimate.additionalDiscountType,
          additionalDiscountLabel: freshEstimate.additionalDiscountLabel ?? null,
          additionalCharges: invoiceTotals.additionalCharges ?? 0,
          additionalChargesLabel: freshEstimate.additionalChargesLabel ?? null,
          taxableAmount: invoiceTotals.taxable,
          cgst: invoiceTotals.cgst,
          sgst: invoiceTotals.sgst,
          igst: invoiceTotals.igst,
          totalTax: invoiceTotals.tax,
          total: invoiceTotals.total,
          amountPaid: 0,
          notes: freshEstimate.notes ?? null,
          terms: freshEstimate.terms ?? null,
          items: invoiceItemInputs,
        },
        tx,
      );

      // 4. Update the Estimate to CONVERTED and link to generated invoice
      const updatedEstimate = await estimateRepository.updateStatus(
        organizationId,
        freshEstimate.id,
        "Converted",
        {
          convertedToInvoiceId: createdInvoice.id,
          convertedAt: new Date(),
        },
        tx,
      );

      return {
        estimate: updatedEstimate,
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.number,
      };
    });

    revalidatePath("/estimates");
    revalidatePath(`/estimates/${id}`);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${result.invoiceId}`);

    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
