"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveInvoiceContext } from "../context/invoice-context";
import { invoiceRepository } from "../../infrastructure/repositories/prisma-invoice-repository";
import { paymentRepository } from "@/features/payments/infrastructure/repositories/prisma-payment-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import { billingSettingsRepository } from "@/features/billing-settings";
import { getSupplierTaxContext } from "../queries/get-supplier-tax-context";
import type { SupplierTaxContext } from "../queries/get-supplier-tax-context";
import {
  calculateInvoiceTotals,
  lineTax,
  lineTaxable,
  type Invoice,
  type InvoiceLineItem,
} from "../../domain/invoice";
import { determineTaxMode } from "../../domain/rules/tax-rules";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
} from "../validators/invoice-schemas";
import type {
  CreateInvoiceInputDto,
  InvoiceActionResult,
  UpdateInvoiceInputDto,
} from "../dto/invoice-dto";
import {
  DuplicateInvoiceNumberError,
  InvalidCustomerReferenceError,
  InvalidInvoiceStatusTransitionError,
  InvoiceNotCancellableError,
  InvoiceNotFoundError,
  UnauthorizedInvoiceAccessError,
} from "../../domain/errors/invoice-errors";

export type InvoiceCreationContext = {
  organizationId: string;
  /**
   * Whether Issued status is permitted. Owner/admin members pass true; the
   * authorized recurring scheduler passes true only for schedules that an
   * owner/admin created or activated (standing issuance authorization,
   * recorded per generation). Members creating interactively pass
   * `isOrganizationAdmin(memberRole)`.
   */
  allowIssued: boolean;
  /**
   * Pre-resolved supplier tax context for session-less system flows.
   * Resolved from the session when absent (interactive use).
   */
  supplierTax?: SupplierTaxContext;
  /** Durable generation linkage for scheduler-created invoices. */
  recurringLink?: { recurringScheduleId: string; recurringPeriod: string };
};

/**
 * Shared invoice creation core: validation, authoritative tax/totals,
 * numbering, and persistence. Used by the interactive server action and by
 * the authorized recurring scheduler so generated invoices are ordinary
 * invoices — never a parallel implementation.
 */
export const createInvoiceWithContext = async (
  creationContext: InvoiceCreationContext,
  input: CreateInvoiceInputDto,
): Promise<InvoiceActionResult<Invoice>> => {
  try {
    const parseResult = createInvoiceSchema.safeParse(input);
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

    const { organizationId } = creationContext;
    const data = parseResult.data;

    // DEF-004/DEF-005: payment statuses are derived from authoritative money,
    // never trusted from the client. Creation may only start as Draft/Issued;
    // Paid/Partially Paid arise from real payments/settlement, not form input.
    if (data.status !== "Draft" && data.status !== "Issued") {
      throw new InvalidInvoiceStatusTransitionError(data.status, "create");
    }

    // DEF-006: issuing an invoice creates a financial claim — owner/admin or
    // an explicitly authorized system scheduler only.
    if (data.status === "Issued" && !creationContext.allowIssued) {
      throw new UnauthorizedInvoiceAccessError(
        "Only organization owners or admins can issue invoices.",
      );
    }

    // 1. Verify customer belongs to this organization if customerId is provided
    let verifiedCustomer = null;
    if (data.customerId) {
      verifiedCustomer = await customerRepository.findById(organizationId, data.customerId);
      if (!verifiedCustomer) {
        throw new InvalidCustomerReferenceError(data.customerId);
      }
    }

    // 2. Authoritative Place of Supply & Tax Mode determination
    const supplierTax = creationContext.supplierTax ?? (await getSupplierTaxContext());
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

    // 3. Prepare domain line items & server-side recalculations
    const domainItems: InvoiceLineItem[] = data.items.map((it, idx) => ({
      id: it.id || `line-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
      item: it.item,
      description: it.description || "",
      hsnSac: it.hsnSac || undefined,
      unit: it.unit || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    }));

    // Authoritative totals calculation
    const calculatedTotals = calculateInvoiceTotals({
      items: domainItems,
      amountPaid: data.amountPaid,
      taxMode,
      additionalCharges: data.additionalCharges,
      additionalDiscount: data.additionalDiscount,
      additionalDiscountType: data.additionalDiscountType,
    });

    // DEF-005: amountPaid is manual tender recorded at creation — it must never
    // exceed the server-computed total. There is no Payment model; forging a
    // larger amountPaid would fabricate a payment.
    if (data.amountPaid > calculatedTotals.total) {
      return {
        success: false,
        error: `Amount paid (₹${data.amountPaid.toFixed(2)}) cannot exceed the invoice total (₹${calculatedTotals.total.toFixed(2)}).`,
        fieldErrors: { amountPaid: "Amount paid cannot exceed the invoice total." },
      };
    }

    // Compute line-level amounts for snapshot persistence
    const repositoryItems = domainItems.map((it, idx) => {
      const taxable = lineTaxable(it);
      const taxAmt = lineTax(it);
      const lineTot = taxable + taxAmt;
      return {
        id: `item_${crypto.randomUUID()}`,
        productId: data.items[idx]?.productId ?? null,
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

    // 4. Authoritative sequence allocation via BillingSettings
    const allocated = await billingSettingsRepository.allocateNextNumber(
      organizationId,
      "INVOICE",
    );

    const finalInvoiceNumber = allocated.allocatedNumber;
    const invoiceId = `inv_${crypto.randomUUID()}`;

    const saved = await invoiceRepository.create({
      id: invoiceId,
      organizationId,
      invoiceNumber: finalInvoiceNumber,
      customerId: data.customerId ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      customerGstin: data.customerGstin || null,
      customerPlaceOfSupply: placeOfSupply || null,
      issueDate: new Date(`${data.issueDate}T00:00:00.000Z`),
      dueDate: new Date(`${data.dueDate}T00:00:00.000Z`),
      paymentTerms: data.paymentTerms,
      status: data.status,
      taxMode,
      currency: "INR (₹)",
      subtotal: calculatedTotals.subtotal,
      lineDiscountTotal: calculatedTotals.discount - (calculatedTotals.additionalDiscount ?? 0),
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
      amountPaid: data.amountPaid,
      notes: data.notes || null,
      terms: data.terms || null,
      recurringScheduleId: creationContext.recurringLink?.recurringScheduleId ?? null,
      recurringPeriod: creationContext.recurringLink?.recurringPeriod ?? null,
      items: repositoryItems,
    });

    revalidatePath("/invoices");
    revalidatePath("/invoices/new");
    revalidatePath("/settings/billing");
    revalidatePath(`/invoices/${saved.id}`);

    return {
      success: true,
      data: saved,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const createInvoiceAction = async (
  input: CreateInvoiceInputDto,
): Promise<InvoiceActionResult<Invoice>> => {
  try {
    const { organizationId, memberRole } = await resolveInvoiceContext();
    return await createInvoiceWithContext(
      { organizationId, allowIssued: isOrganizationAdmin(memberRole) },
      input,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const updateInvoiceAction = async (
  input: UpdateInvoiceInputDto,
): Promise<InvoiceActionResult<Invoice>> => {
  try {
    const parseResult = updateInvoiceSchema.safeParse(input);
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

    const { organizationId, memberRole } = await resolveInvoiceContext();
    const data = parseResult.data;

    const existing = await invoiceRepository.findById(organizationId, data.id);
    if (!existing) {
      throw new InvoiceNotFoundError(data.id);
    }

    // Only Draft invoices can be updated
    if (existing.status !== "Draft") {
      throw new InvalidInvoiceStatusTransitionError(existing.status, "edit");
    }

    // DEF-004: a draft edit may only remain a Draft or be issued. Payment
    // statuses stay server-derived; a normal edit must not forge a payment.
    if (data.status !== "Draft" && data.status !== "Issued") {
      throw new InvalidInvoiceStatusTransitionError(data.status, "update");
    }

    // DEF-006: issuing via update is a financial mutation — owner/admin only.
    if (data.status === "Issued" && !isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedInvoiceAccessError(
        "Only organization owners or admins can issue invoices.",
      );
    }

    // 1. Verify customer
    let verifiedCustomer = null;
    if (data.customerId) {
      verifiedCustomer = await customerRepository.findById(organizationId, data.customerId);
      if (!verifiedCustomer) {
        throw new InvalidCustomerReferenceError(data.customerId);
      }
    }

    // 2. Authoritative tax determination
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

    // 3. Recalculate totals
    const domainItems: InvoiceLineItem[] = data.items.map((it, idx) => ({
      id: it.id || `line-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
      item: it.item,
      description: it.description || "",
      hsnSac: it.hsnSac || undefined,
      unit: it.unit || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    }));

    const calculatedTotals = calculateInvoiceTotals({
      items: domainItems,
      amountPaid: data.amountPaid,
      taxMode,
      additionalCharges: data.additionalCharges,
      additionalDiscount: data.additionalDiscount,
      additionalDiscountType: data.additionalDiscountType,
    });

    // DEF-005: a draft edit must not silently forge or inflate a payment.
    // Combined with any allocated payment cash, the tender must not exceed
    // the total (drafts cannot carry allocations today; this guards the
    // invariant if that ever changes).
    const existingAllocatedCash = existing.allocatedCash ?? 0;
    if (data.amountPaid + existingAllocatedCash > calculatedTotals.total) {
      return {
        success: false,
        error: `Amount paid (₹${data.amountPaid.toFixed(2)}) plus allocated payments cannot exceed the invoice total (₹${calculatedTotals.total.toFixed(2)}).`,
        fieldErrors: { amountPaid: "Amount paid cannot exceed the invoice total." },
      };
    }

    // Retain existing number unless a non-conflicting manual number is provided
    let finalInvoiceNumber = existing.number;
    if (data.invoiceNumber && data.invoiceNumber !== existing.number) {
      const existingConflict = await invoiceRepository.findByNumber(organizationId, data.invoiceNumber);
      if (existingConflict && existingConflict.id !== existing.id) {
        throw new DuplicateInvoiceNumberError(data.invoiceNumber);
      }
      finalInvoiceNumber = data.invoiceNumber;
    }

    const repositoryItems = domainItems.map((it, idx) => {
      const taxable = lineTaxable(it);
      const taxAmt = lineTax(it);
      const lineTot = taxable + taxAmt;
      return {
        id: `item_${crypto.randomUUID()}`,
        productId: data.items[idx]?.productId ?? null,
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

    const updated = await invoiceRepository.update(organizationId, data.id, {
      id: data.id,
      organizationId,
      invoiceNumber: finalInvoiceNumber,
      customerId: data.customerId ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      customerGstin: data.customerGstin || null,
      customerPlaceOfSupply: placeOfSupply || null,
      issueDate: new Date(`${data.issueDate}T00:00:00.000Z`),
      dueDate: new Date(`${data.dueDate}T00:00:00.000Z`),
      paymentTerms: data.paymentTerms,
      status: data.status,
      taxMode,
      currency: "INR (₹)",
      subtotal: calculatedTotals.subtotal,
      lineDiscountTotal: calculatedTotals.discount - (calculatedTotals.additionalDiscount ?? 0),
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
      amountPaid: data.amountPaid,
      notes: data.notes || null,
      terms: data.terms || null,
      items: repositoryItems,
    });

    revalidatePath("/invoices");
    revalidatePath("/invoices/new");
    revalidatePath("/settings/billing");
    revalidatePath(`/invoices/${updated.id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const deleteInvoiceAction = async (
  id: string,
): Promise<InvoiceActionResult<{ id: string }>> => {
  try {
    const { organizationId, memberRole } = await resolveInvoiceContext();

    // DEF-006: deleting even a draft removes financial history — owner/admin only.
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedInvoiceAccessError(
        "Only organization owners or admins can delete invoices.",
      );
    }

    const existing = await invoiceRepository.findById(organizationId, id);
    if (!existing) {
      throw new InvoiceNotFoundError(id);
    }

    if (existing.status !== "Draft") {
      throw new InvalidInvoiceStatusTransitionError(existing.status, "delete");
    }

    // Row-level Draft guard closes the race where a concurrent issuance
    // commits between the check above and this delete.
    const deleted = await invoiceRepository.delete(organizationId, id);
    if (deleted === 0) {
      throw new InvalidInvoiceStatusTransitionError(existing.status, "delete");
    }

    revalidatePath("/invoices");

    return {
      success: true,
      data: { id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

/**
 * Issues a draft invoice. Dedicated issuance path: re-reads the invoice
 * inside a row-locked transaction so concurrent issue/delete requests cannot
 * both succeed. Only Draft invoices can be issued; issuing records no payment.
 */
export const issueInvoiceAction = async (
  id: string,
): Promise<InvoiceActionResult<Invoice>> => {
  try {
    const { organizationId, memberRole } = await resolveInvoiceContext();

    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedInvoiceAccessError(
        "Only organization owners or admins can issue invoices.",
      );
    }

    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM invoice
        WHERE "id" = ${id} AND "organizationId" = ${organizationId}
        FOR UPDATE
      `;
      const current = await tx.invoice.findUnique({
        where: { id },
        select: { id: true, organizationId: true, status: true },
      });
      if (!current || current.organizationId !== organizationId) {
        throw new InvoiceNotFoundError(id);
      }
      if (current.status !== PrismaInvoiceStatus.DRAFT) {
        throw new InvalidInvoiceStatusTransitionError(current.status, "issue");
      }
      await tx.invoice.update({
        where: { id },
        data: { status: PrismaInvoiceStatus.ISSUED },
      });
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);

    const reloaded = await invoiceRepository.findById(organizationId, id);
    if (!reloaded) {
      throw new InvoiceNotFoundError(id);
    }

    return {
      success: true,
      data: reloaded,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

/**
 * Cancels an issued invoice. Only working documents (Issued or Overdue) with
 * no recorded money movement — no cash, no issued credits, no issued debits —
 * can be cancelled. Anything with financial history must be adjusted through
 * the credit/debit/payment workflows, never erased. Terminal: cancelled
 * invoices cannot be reissued, edited, or deleted.
 */
export const cancelInvoiceAction = async (
  id: string,
): Promise<InvoiceActionResult<Invoice>> => {
  try {
    const { organizationId, memberRole } = await resolveInvoiceContext();

    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedInvoiceAccessError(
        "Only organization owners or admins can cancel invoices.",
      );
    }

    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM invoice
        WHERE "id" = ${id} AND "organizationId" = ${organizationId}
        FOR UPDATE
      `;
      const current = await tx.invoice.findUnique({
        where: { id },
        select: { id: true, organizationId: true, status: true, amountPaid: true },
      });
      if (!current || current.organizationId !== organizationId) {
        throw new InvoiceNotFoundError(id);
      }
      if (
        current.status !== PrismaInvoiceStatus.ISSUED &&
        current.status !== PrismaInvoiceStatus.OVERDUE
      ) {
        throw new InvalidInvoiceStatusTransitionError(current.status, "cancel");
      }
      if (Number(current.amountPaid) > 0) {
        throw new InvoiceNotCancellableError(
          "cash payments are recorded against it. Record a reversal or credit instead.",
        );
      }
      const allocatedCash = await paymentRepository.getActiveAllocatedTotalForInvoice(
        organizationId,
        id,
        undefined,
        tx,
      );
      if (allocatedCash > 0) {
        throw new InvoiceNotCancellableError(
          "payment allocations are recorded against it. Reverse the payments first.",
        );
      }
      const issuedCredit = await tx.creditNote.findFirst({
        where: { invoiceId: id, organizationId, status: "ISSUED" },
        select: { id: true },
      });
      if (issuedCredit) {
        throw new InvoiceNotCancellableError(
          "issued credit notes reference it. Adjust or void them first.",
        );
      }
      const issuedDebit = await tx.debitNote.findFirst({
        where: { invoiceId: id, organizationId, status: "ISSUED" },
        select: { id: true },
      });
      if (issuedDebit) {
        throw new InvoiceNotCancellableError(
          "issued debit notes reference it. Adjust or void them first.",
        );
      }
      await tx.invoice.update({
        where: { id },
        data: { status: PrismaInvoiceStatus.CANCELLED },
      });
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);

    const reloaded = await invoiceRepository.findById(organizationId, id);
    if (!reloaded) {
      throw new InvoiceNotFoundError(id);
    }

    return {
      success: true,
      data: reloaded,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
