"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/shared/lib/prisma";
import { resolveSalesOrderContext } from "../context/sales-order-context";
import { salesOrderRepository } from "../../infrastructure/repositories/prisma-sales-order-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { estimateRepository } from "@/features/estimates/infrastructure/repositories/prisma-estimate-repository";
import { salesSettingsRepository } from "@/features/sales-settings";
import { billingSettingsRepository } from "@/features/billing-settings";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import {
  canDeleteSalesOrder,
  canEditSalesOrder,
  canRecordFulfilment,
  validateSalesOrderStatusTransition,
} from "../../domain/rules/sales-order-lifecycle-rules";
import { calculateInvoiceTotals, lineTax, lineTaxable } from "@/features/invoices";
import {
  createSalesOrderSchema,
  updateSalesOrderSchema,
  recordFulfilmentSchema,
} from "../validators/sales-order-schemas";
import type {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  RecordFulfilmentDto,
  SalesOrderActionResult,
  ConvertSalesOrderToInvoiceResult,
} from "../dto/sales-order-dto";
import type { SalesOrder, SalesOrderStatus } from "../../domain/entities/sales-order";
import {
  SalesOrderLockedError,
  SalesOrderNotFoundError,
  SalesOrderAlreadyInvoicedError,
  InvalidSalesOrderReferenceError,
  OverFulfilmentError,
} from "../../domain/errors/sales-order-errors";

/**
 * Verifies that a referenced customer belongs to the calling organization.
 */
export const assertCustomerInOrganization = async (
  organizationId: string,
  customerId: string,
): Promise<void> => {
  const customer = await customerRepository.findById(organizationId, customerId);
  if (!customer) {
    throw new InvalidSalesOrderReferenceError("Customer", customerId);
  }
};

/**
 * Verifies that every referenced product belongs to the calling organization.
 */
export const assertProductsInOrganization = async (
  organizationId: string,
  productIds: ReadonlyArray<string | null | undefined>,
): Promise<void> => {
  const ids = [...new Set(productIds.filter((id): id is string => Boolean(id)))];
  const results = await Promise.all(
    ids.map((id) => productRepository.findById(organizationId, id)),
  );
  results.forEach((product, idx) => {
    if (!product) {
      throw new InvalidSalesOrderReferenceError("Product", ids[idx]);
    }
  });
};

/**
 * Verifies that a source quotation belongs to the calling organization and is
 * eligible for conversion (active status, not already converted).
 */
export const assertConvertibleEstimate = async (
  organizationId: string,
  estimateId: string,
): Promise<void> => {
  const estimate = await estimateRepository.findById(organizationId, estimateId);
  if (!estimate) {
    throw new InvalidSalesOrderReferenceError("Quotation", estimateId);
  }
  if (estimate.convertedToSalesOrderId) {
    throw new InvalidSalesOrderReferenceError(
      "Quotation (already converted)",
      estimateId,
    );
  }
  if (
    estimate.status !== "Accepted" &&
    estimate.status !== "Draft" &&
    estimate.status !== "Sent"
  ) {
    throw new InvalidSalesOrderReferenceError(
      `Quotation (status "${estimate.status}" cannot be converted)`,
      estimateId,
    );
  }
};

/**
 * Creates a new Sales Order manually or from scratch.
 * Number allocation is guaranteed unique and organization-scoped.
 */
export const createSalesOrderAction = async (
  input: CreateSalesOrderDto,
): Promise<SalesOrderActionResult<SalesOrder>> => {
  try {
    const parseResult = createSalesOrderSchema.safeParse(input);
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

    const { organizationId } = await resolveSalesOrderContext();
    const data = parseResult.data;

    if (data.customerId) {
      await assertCustomerInOrganization(organizationId, data.customerId);
    }
    await assertProductsInOrganization(
      organizationId,
      data.items.map((it) => it.productId),
    );
    if (data.sourceEstimateId) {
      await assertConvertibleEstimate(organizationId, data.sourceEstimateId);
    }

    const prisma = getPrisma();
    const order = await prisma.$transaction(async (tx) => {
      let finalOrderNumber = data.orderNumber?.trim();
      if (!finalOrderNumber) {
        const allocated = await salesSettingsRepository.allocateNextSalesOrderNumber(
          organizationId,
          tx,
        );
        finalOrderNumber = allocated.allocatedNumber;
      } else {
        const existing = await salesOrderRepository.findByNumber(
          organizationId,
          finalOrderNumber,
          tx,
        );

        if (existing) {
          throw new Error(
            `A sales order with number "${finalOrderNumber}" already exists in this organization.`,
          );
        }
      }

      return salesOrderRepository.create(
        organizationId,
        {
          orderNumber: finalOrderNumber,
          customerId: data.customerId || null,
          customerName: data.customerName,
          customerEmail: data.customerEmail || null,
          customerAddress: data.customerAddress || null,
          customerGstin: data.customerGstin || null,
          customerPlaceOfSupply: data.customerPlaceOfSupply || null,
          orderDate: new Date(data.orderDate),
          expectedDeliveryDate: data.expectedDeliveryDate
            ? new Date(data.expectedDeliveryDate)
            : null,
          referenceNumber: data.referenceNumber || null,
          status: (data.status as SalesOrderStatus) || "Draft",
          taxMode: data.taxMode || "CGST_SGST",
          currency: data.currency || "INR (₹)",
          notes: data.notes || null,
          terms: data.terms || null,
          additionalCharges: data.additionalCharges || 0,
          additionalChargesLabel: data.additionalChargesLabel || null,
          additionalDiscount: data.additionalDiscount || 0,
          additionalDiscountType: data.additionalDiscountType || "fixed",
          additionalDiscountLabel: data.additionalDiscountLabel || null,
          sourceEstimateId: data.sourceEstimateId || null,
          items: data.items.map((it, idx) => ({
            productId: it.productId || null,
            item: it.item,
            description: it.description || null,
            hsnSac: it.hsnSac || null,
            quantity: it.quantity,
            fulfilledQuantity: 0,
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
            taxRate: it.taxRate || 18,
            sortOrder: idx,
          })),
        },
        tx,
      );
    });

    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${order.id}`);
    if (data.sourceEstimateId) {
      revalidatePath("/estimates");
      revalidatePath(`/estimates/${data.sourceEstimateId}`);
    }

    return {
      success: true,
      data: order,
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

/**
 * Updates an existing Draft Sales Order. Non-draft orders are locked.
 */
export const updateSalesOrderAction = async (
  id: string,
  input: UpdateSalesOrderDto,
): Promise<SalesOrderActionResult<SalesOrder>> => {
  try {
    const parseResult = updateSalesOrderSchema.safeParse(input);
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

    const { organizationId } = await resolveSalesOrderContext();
    const existing = await salesOrderRepository.findById(organizationId, id);
    if (!existing) {
      throw new SalesOrderNotFoundError(id);
    }

    if (!canEditSalesOrder(existing)) {
      throw new SalesOrderLockedError(existing.orderNumber, existing.status);
    }

    const data = parseResult.data;

    if (data.customerId) {
      await assertCustomerInOrganization(organizationId, data.customerId);
    }
    if (data.items) {
      await assertProductsInOrganization(
        organizationId,
        data.items.map((it) => it.productId),
      );
    }
    const updated = await salesOrderRepository.update(organizationId, id, {
      ...(data.customerName && { customerName: data.customerName }),
      ...(data.customerId !== undefined && { customerId: data.customerId }),
      ...(data.customerEmail !== undefined && { customerEmail: data.customerEmail }),
      ...(data.customerAddress !== undefined && { customerAddress: data.customerAddress }),
      ...(data.customerGstin !== undefined && { customerGstin: data.customerGstin }),
      ...(data.customerPlaceOfSupply !== undefined && {
        customerPlaceOfSupply: data.customerPlaceOfSupply,
      }),
      ...(data.orderDate && { orderDate: new Date(data.orderDate) }),
      ...(data.expectedDeliveryDate !== undefined && {
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null,
      }),
      ...(data.referenceNumber !== undefined && {
        referenceNumber: data.referenceNumber,
      }),
      ...(data.taxMode && { taxMode: data.taxMode }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.terms !== undefined && { terms: data.terms }),
      ...(data.additionalCharges !== undefined && {
        additionalCharges: data.additionalCharges,
      }),
      ...(data.additionalChargesLabel !== undefined && {
        additionalChargesLabel: data.additionalChargesLabel,
      }),
      ...(data.additionalDiscount !== undefined && {
        additionalDiscount: data.additionalDiscount,
      }),
      ...(data.additionalDiscountType && {
        additionalDiscountType: data.additionalDiscountType,
      }),
      ...(data.additionalDiscountLabel !== undefined && {
        additionalDiscountLabel: data.additionalDiscountLabel,
      }),
      ...(data.items && {
        items: data.items.map((it, idx) => ({
          productId: it.productId || null,
          item: it.item,
          description: it.description || null,
          hsnSac: it.hsnSac || null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          taxRate: it.taxRate || 18,
          sortOrder: idx,
        })),
      }),
    });

    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${id}`);

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

/**
 * Transitions Sales Order status (e.g. Draft -> Confirmed, Confirmed -> Cancelled).
 */
export const transitionSalesOrderStatusAction = async (
  id: string,
  targetStatus: SalesOrderStatus,
): Promise<SalesOrderActionResult<SalesOrder>> => {
  try {
    const { organizationId } = await resolveSalesOrderContext();
    const existing = await salesOrderRepository.findById(organizationId, id);
    if (!existing) {
      throw new SalesOrderNotFoundError(id);
    }

    validateSalesOrderStatusTransition(existing.status, targetStatus);

    const updated = await salesOrderRepository.updateStatus(
      organizationId,
      id,
      targetStatus,
    );

    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${id}`);

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

/**
 * Deletes a Draft Sales Order.
 */
export const deleteSalesOrderAction = async (
  id: string,
): Promise<SalesOrderActionResult<null>> => {
  try {
    const { organizationId } = await resolveSalesOrderContext();
    const existing = await salesOrderRepository.findById(organizationId, id);
    if (!existing) {
      throw new SalesOrderNotFoundError(id);
    }

    if (!canDeleteSalesOrder(existing)) {
      throw new SalesOrderLockedError(existing.orderNumber, existing.status);
    }

    await salesOrderRepository.delete(organizationId, id);

    revalidatePath("/sales-orders");

    return {
      success: true,
      data: null,
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

/**
 * Converts an eligible Accepted Quotation into a confirmed Sales Order atomically.
 * Prevents duplicate conversions and maintains bidirectional relations.
 */
export const convertEstimateToSalesOrderAction = async (
  estimateId: string,
): Promise<SalesOrderActionResult<SalesOrder>> => {
  try {
    const { organizationId } = await resolveSalesOrderContext();
    const prisma = getPrisma();

    const createdOrder = await prisma.$transaction(async (tx) => {
      // Read inside the transaction: conversion needs the full persistence
      // row, which the presentation-shaped domain Estimate intentionally
      // omits. Organization membership is enforced explicitly below.
      const freshEstimate = await tx.estimate.findUnique({
        where: { id: estimateId },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      });

      if (!freshEstimate || freshEstimate.organizationId !== organizationId) {
        throw new Error(`Quotation "${estimateId}" was not found.`);
      }

      if (freshEstimate.convertedToSalesOrderId) {
        throw new Error(
          `This quotation has already been converted to sales order ${freshEstimate.convertedToSalesOrderId}.`,
        );
      }

      if (freshEstimate.status !== "ACCEPTED" && freshEstimate.status !== "DRAFT" && freshEstimate.status !== "SENT") {
        throw new Error(
          `Only active or accepted quotations can be converted to a sales order (current status: ${freshEstimate.status}).`,
        );
      }

      const salesSettings = await salesSettingsRepository.getSettings(
        organizationId,
        tx,
      );
      const allocated = await salesSettingsRepository.allocateNextSalesOrderNumber(
        organizationId,
        tx,
      );

      const orderDate = new Date();
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(
        expectedDeliveryDate.getDate() + (salesSettings.defaultDeliveryDays || 15),
      );

      const items = freshEstimate.items.map((it, idx) => ({
        productId: it.productId || null,
        item: it.item,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        quantity: Number(it.quantity),
        fulfilledQuantity: 0,
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
        taxRate: Number(it.taxRate),
        sortOrder: idx,
      }));

      const newOrder = await salesOrderRepository.create(
        organizationId,
        {
          orderNumber: allocated.allocatedNumber,
          customerId: freshEstimate.customerId || null,
          customerName: freshEstimate.customerName,
          customerEmail: freshEstimate.customerEmail || null,
          customerAddress: freshEstimate.customerAddress || null,
          customerGstin: freshEstimate.customerGstin || null,
          customerPlaceOfSupply: freshEstimate.customerPlaceOfSupply || null,
          orderDate,
          expectedDeliveryDate,
          referenceNumber: freshEstimate.referenceNumber || null,
          status: "Confirmed",
          taxMode: (freshEstimate.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
          currency: freshEstimate.currency || "INR (₹)",
          notes:
            salesSettings.defaultSalesOrderNotes ||
            freshEstimate.notes ||
            null,
          terms:
            salesSettings.defaultSalesOrderTerms ||
            freshEstimate.terms ||
            null,
          additionalCharges: Number(freshEstimate.additionalCharges) || 0,
          additionalChargesLabel: freshEstimate.additionalChargesLabel || null,
          additionalDiscount: Number(freshEstimate.additionalDiscount) || 0,
          additionalDiscountType:
            (freshEstimate.additionalDiscountType as "fixed" | "percentage") ||
            "fixed",
          additionalDiscountLabel: freshEstimate.additionalDiscountLabel || null,
          sourceEstimateId: freshEstimate.id,
          items,
        },
        tx,
      );

      return newOrder;
    });

    revalidatePath("/estimates");
    revalidatePath(`/estimates/${estimateId}`);
    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${createdOrder.id}`);

    return {
      success: true,
      data: createdOrder,
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

/**
 * Converts an eligible Sales Order to a genuine Invoice through invoice application services.
 * Maintains clean multi-tenant isolation, allocates invoice numbers safely, and prevents duplicates.
 */
export const convertSalesOrderToInvoiceAction = async (
  salesOrderId: string,
): Promise<SalesOrderActionResult<ConvertSalesOrderToInvoiceResult>> => {
  try {
    const { organizationId } = await resolveSalesOrderContext();
    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      // Read inside the transaction: conversion needs the full persistence
      // row (Prisma enum literals, Decimal line values), which the
      // presentation-shaped domain SalesOrder intentionally omits.
      const freshOrder = await tx.salesOrder.findFirst({
        where: { id: salesOrderId, organizationId },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          invoices: true,
        },
      });

      if (!freshOrder) {
        throw new SalesOrderNotFoundError(salesOrderId);
      }

      if (
        freshOrder.status !== "CONFIRMED" &&
        freshOrder.status !== "PARTIALLY_FULFILLED" &&
        freshOrder.status !== "FULFILLED"
      ) {
        throw new Error(
          `Only Confirmed or Fulfilled sales orders can be invoiced (current status: ${freshOrder.status}).`,
        );
      }

      if (freshOrder.invoices && freshOrder.invoices.length > 0) {
        throw new SalesOrderAlreadyInvoicedError(
          freshOrder.orderNumber,
          freshOrder.invoices[0].id,
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
      const invoiceLineItems = freshOrder.items.map((it, idx) => ({
        id: `line-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
        item: it.item,
        description: it.description || "",
        hsnSac: it.hsnSac || undefined,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
        taxRate: Number(it.taxRate),
      }));

      const invoiceTotals = calculateInvoiceTotals({
        items: invoiceLineItems,
        amountPaid: 0,
        taxMode: (freshOrder.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
        additionalCharges: Number(freshOrder.additionalCharges) || 0,
        additionalDiscount: Number(freshOrder.additionalDiscount) || 0,
        additionalDiscountType:
          (freshOrder.additionalDiscountType as "percentage" | "fixed") ||
          "fixed",
      });

      const issueDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const invoiceItemInputs = freshOrder.items.map((it, idx) => {
        const lineItem = invoiceLineItems[idx];
        const taxable = lineTaxable(lineItem);
        const taxAmt = lineTax(lineItem);
        return {
          id: `item_${crypto.randomUUID()}`,
          productId: it.productId ?? null,
          item: it.item,
          description: it.description ?? null,
          hsnSac: it.hsnSac ?? null,
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

      // 3. Create genuine Invoice linked to this Sales Order
      const createdInvoice = await invoiceRepository.create(
        {
          id: invoiceId,
          organizationId,
          invoiceNumber,
          customerId: freshOrder.customerId ?? null,
          customerName: freshOrder.customerName,
          customerEmail: freshOrder.customerEmail ?? null,
          customerAddress: freshOrder.customerAddress ?? null,
          customerGstin: freshOrder.customerGstin ?? null,
          customerPlaceOfSupply: freshOrder.customerPlaceOfSupply ?? null,
          issueDate,
          dueDate,
          paymentTerms: "Net 15 days",
          status: "Draft",
          taxMode: freshOrder.taxMode,
          currency: freshOrder.currency,
          subtotal: invoiceTotals.subtotal,
          lineDiscountTotal:
            invoiceTotals.discount - (invoiceTotals.additionalDiscount ?? 0),
          additionalDiscount: invoiceTotals.additionalDiscount ?? 0,
          additionalDiscountType: freshOrder.additionalDiscountType,
          additionalDiscountLabel: freshOrder.additionalDiscountLabel ?? null,
          additionalCharges: invoiceTotals.additionalCharges ?? 0,
          additionalChargesLabel: freshOrder.additionalChargesLabel ?? null,
          taxableAmount: invoiceTotals.taxable,
          cgst: invoiceTotals.cgst,
          sgst: invoiceTotals.sgst,
          igst: invoiceTotals.igst,
          totalTax: invoiceTotals.tax,
          total: invoiceTotals.total,
          amountPaid: 0,
          notes: freshOrder.notes ?? null,
          terms: freshOrder.terms ?? null,
          items: invoiceItemInputs,
        },
        tx,
      );

      // 4. Update the Invoice with salesOrderId relation
      await tx.invoice.update({
        where: { id: createdInvoice.id },
        data: { salesOrderId: freshOrder.id },
      });

      const updatedSalesOrder = await salesOrderRepository.findById(
        organizationId,
        freshOrder.id,
        tx,
      );

      if (!updatedSalesOrder) {
        throw new SalesOrderNotFoundError(freshOrder.id);
      }

      return {
        salesOrder: updatedSalesOrder,
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.number,
      };
    });

    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${salesOrderId}`);
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

/**
 * Records fulfilment of line items up to the ordered quantity.
 */
export const recordFulfilmentAction = async (
  salesOrderId: string,
  input: RecordFulfilmentDto,
): Promise<SalesOrderActionResult<SalesOrder>> => {
  try {
    const parseResult = recordFulfilmentSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed on fulfilment input.",
      };
    }

    const { organizationId } = await resolveSalesOrderContext();
    const existing = await salesOrderRepository.findById(organizationId, salesOrderId);
    if (!existing) {
      throw new SalesOrderNotFoundError(salesOrderId);
    }

    if (!canRecordFulfilment(existing)) {
      throw new Error(
        `Fulfilment cannot be recorded for orders in "${existing.status}" status.`,
      );
    }

    // Validate quantities
    const itemMap = new Map(existing.items.map((it) => [it.id, it]));
    for (const updateItem of parseResult.data.items) {
      const line = itemMap.get(updateItem.id);
      if (!line) {
        throw new Error(`Line item "${updateItem.id}" not found on order.`);
      }
      if (updateItem.fulfilledQuantity > line.quantity) {
        throw new OverFulfilmentError(
          line.item,
          line.quantity,
          updateItem.fulfilledQuantity,
        );
      }
    }

    const updated = await salesOrderRepository.updateItemFulfilment(
      organizationId,
      salesOrderId,
      parseResult.data.items,
    );

    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${salesOrderId}`);

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
