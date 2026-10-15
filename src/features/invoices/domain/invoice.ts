export type InvoiceStatus = "Draft" | "Issued" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";
export type TaxMode = "CGST_SGST" | "IGST";

// DEF-011: single authoritative money implementation lives in shared/lib;
// this domain re-exports the names its consumers already import.
import { formatCurrency as sharedFormatCurrency, roundCurrency } from "@/shared/lib/money";
export { roundCurrency };

export type InvoiceLineItem = {
  id: string;
  item: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type Invoice = {
  id: string;
  number: string;
  customer: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  customerPlaceOfSupply?: string;
  customerId?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  taxMode: TaxMode;
  notes: string;
  paymentTerms: string;
  terms: string;
  items: InvoiceLineItem[];
  amountPaid: number;
  creditedAmount?: number;
  debitedAmount?: number;
  /**
   * Cash received through Payment allocations (active records only).
   * Added with Payments Received: effective cash = legacy `amountPaid` +
   * `allocatedCash`. Absent (undefined) behaves as zero, preserving every
   * existing caller.
   */
  allocatedCash?: number;
  additionalCharges?: number;
  additionalChargesLabel?: string;
  additionalDiscount?: number;
  additionalDiscountType?: "percentage" | "fixed";
  additionalDiscountLabel?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InvoiceTotals = {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  balance: number;
  creditedAmount?: number;
  debitedAmount?: number;
  allocatedCash?: number;
  additionalCharges?: number;
  additionalDiscount?: number;
};

export const canEditInvoice = (invoice: Pick<Invoice, "status">) => invoice.status === "Draft";

export type ReceivableBreakdown = {
  total: number;
  amountPaid: number;
  allocatedCash: number;
  creditedAmount: number;
  debitedAmount: number;
  remainingReceivable: number;
  isCashFullyPaid: boolean;
  isFullySettled: boolean;
};

/**
 * Authoritative remaining-receivable calculation (DEF-002/DEF-003).
 * Cash received (`amountPaid` legacy tender + `allocatedCash` from active
 * Payment allocations) and issued Credit Note amounts (`creditedAmount`)
 * are kept distinct: cash reduces the outstanding balance and alone can mark
 * Paid; credits reduce it but never count as payment. Issued Debit Note
 * amounts (`creditedAmount`) record additional billed value and increase the
 * outstanding balance. Never invents payment records; callers must supply
 * persisted sums.
 */
export const calculateRemainingReceivable = ({
  total,
  amountPaid,
  allocatedCash = 0,
  creditedAmount = 0,
  debitedAmount = 0,
}: {
  total: number;
  amountPaid: number;
  allocatedCash?: number;
  creditedAmount?: number;
  debitedAmount?: number;
}): ReceivableBreakdown => {
  const roundedTotal = roundCurrency(total);
  const roundedPaid = roundCurrency(Math.max(0, amountPaid));
  const roundedAllocated = roundCurrency(Math.max(0, allocatedCash));
  const effectiveCash = roundCurrency(roundedPaid + roundedAllocated);
  const roundedCredited = roundCurrency(Math.max(0, creditedAmount));
  const roundedDebited = roundCurrency(Math.max(0, debitedAmount));
  const obligation = roundCurrency(roundedTotal - roundedCredited + roundedDebited);
  const remainingReceivable = roundCurrency(
    Math.max(0, obligation - effectiveCash),
  );
  return {
    total: roundedTotal,
    amountPaid: roundedPaid,
    allocatedCash: roundedAllocated,
    creditedAmount: roundedCredited,
    debitedAmount: roundedDebited,
    remainingReceivable,
    isCashFullyPaid: obligation > 0 && effectiveCash >= obligation,
    isFullySettled: remainingReceivable <= 0,
  };
};

/**
 * Derives the display/payment status from authoritative money (DEF-002/DEF-004).
 * An issued Credit Note is never cash: `Paid` requires cash received covering
 * the total. A fully credited invoice with no (or partial) cash keeps its
 * non-Paid status until the business adopts a dedicated SETTLED/CREDITED state
 * (documented limitation — never misrepresents credit as cash received).
 * Issued Debit Notes increase the obligation: a previously Paid invoice with a
 * new outstanding debit balance derives Partially Paid (cash was received and
 * a balance remains), never back to Issued. Draft/Cancelled are terminal for
 * this derivation and preserved as-is.
 */
export const deriveInvoicePaymentStatus = ({
  currentStatus,
  total,
  amountPaid,
  allocatedCash = 0,
  creditedAmount = 0,
  debitedAmount = 0,
}: {
  currentStatus: InvoiceStatus;
  total: number;
  amountPaid: number;
  allocatedCash?: number;
  creditedAmount?: number;
  debitedAmount?: number;
}): InvoiceStatus => {
  if (currentStatus === "Draft" || currentStatus === "Cancelled") {
    return currentStatus;
  }
  const breakdown = calculateRemainingReceivable({ total, amountPaid, allocatedCash, creditedAmount, debitedAmount });
  if (breakdown.isCashFullyPaid) {
    return "Paid";
  }
  if (breakdown.isFullySettled) {
    // Fully covered by credits (with or without partial cash): do NOT report
    // as cash-paid. Preserve the current working status pending a SETTLED state.
    return currentStatus;
  }
  if (roundCurrency(breakdown.amountPaid + breakdown.allocatedCash) > 0) {
    return "Partially Paid";
  }
  // Credit-only partial adjustments leave Issued/Overdue untouched so the
  // status never implies cash was received.
  return currentStatus;
};

/**
 * Whether an invoice may be cancelled. Only working documents (Issued or
 * Overdue) with no recorded money movement — no cash, no issued credits, no
 * issued debits — can be cancelled. Anything with financial history must be
 * adjusted (credit/debit/payment workflows), never erased, so history and
 * auditability are preserved. Cancelled/Draft/Paid invoices are never
 * cancellable through this path.
 */
export const canCancelInvoice = ({
  status,
  amountPaid,
  allocatedCash = 0,
  creditedAmount = 0,
  debitedAmount = 0,
}: {
  status: InvoiceStatus;
  amountPaid: number;
  allocatedCash?: number;
  creditedAmount?: number;
  debitedAmount?: number;
}): boolean => {
  if (status !== "Issued" && status !== "Overdue") {
    return false;
  }
  return (
    roundCurrency(Math.max(0, amountPaid)) <= 0 &&
    roundCurrency(Math.max(0, allocatedCash)) <= 0 &&
    roundCurrency(Math.max(0, creditedAmount)) <= 0 &&
    roundCurrency(Math.max(0, debitedAmount)) <= 0
  );
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolves the display status for invoice UI (badges, filters, lists).
 * Payment-derived states come from `deriveInvoicePaymentStatus`; Overdue is
 * time-derived, never stored by a transition: a working invoice (Issued,
 * Partially Paid, or stored Overdue) with a remaining balance whose due date
 * is past is shown as Overdue. Fully settled invoices never show Overdue,
 * and Draft/Cancelled are never time-affected. `today` defaults to the
 * existing date convention and is injectable for deterministic tests.
 */
export const resolveInvoiceDisplayStatus = ({
  status,
  total,
  amountPaid,
  allocatedCash = 0,
  creditedAmount = 0,
  debitedAmount = 0,
  dueDate,
  today = getTodayDateString(),
}: {
  status: InvoiceStatus;
  total: number;
  amountPaid: number;
  allocatedCash?: number;
  creditedAmount?: number;
  debitedAmount?: number;
  dueDate: string;
  today?: string;
}): InvoiceStatus => {
  const derived = deriveInvoicePaymentStatus({
    currentStatus: status,
    total,
    amountPaid,
    allocatedCash,
    creditedAmount,
    debitedAmount,
  });
  if (derived === "Paid" || derived === "Draft" || derived === "Cancelled") {
    return derived;
  }
  const breakdown = calculateRemainingReceivable({
    total,
    amountPaid,
    allocatedCash,
    creditedAmount,
    debitedAmount,
  });
  if (
    breakdown.remainingReceivable > 0 &&
    ISO_DATE_PATTERN.test(dueDate) &&
    ISO_DATE_PATTERN.test(today) &&
    dueDate < today
  ) {
    return "Overdue";
  }
  return derived;
};

export const lineSubtotal = (line: InvoiceLineItem) => roundCurrency(line.quantity * line.unitPrice);
export const lineDiscount = (line: InvoiceLineItem) => roundCurrency(lineSubtotal(line) * (line.discount / 100));
export const lineTaxable = (line: InvoiceLineItem) => roundCurrency(lineSubtotal(line) - lineDiscount(line));
export const lineTax = (line: InvoiceLineItem) => roundCurrency(lineTaxable(line) * (line.taxRate / 100));

export const calculateInvoiceTotals = (
  invoice: Pick<Invoice, "items" | "amountPaid"> & {
    creditedAmount?: number;
    debitedAmount?: number;
    allocatedCash?: number;
    taxMode?: TaxMode;
    additionalCharges?: number;
    additionalDiscount?: number;
    additionalDiscountType?: "percentage" | "fixed";
  },
): InvoiceTotals => {
  const subtotal = roundCurrency(invoice.items.reduce((sum, line) => sum + lineSubtotal(line), 0));
  const lineDiscountSum = roundCurrency(invoice.items.reduce((sum, line) => sum + lineDiscount(line), 0));
  const baseTaxable = roundCurrency(invoice.items.reduce((sum, line) => sum + lineTaxable(line), 0));

  let extraDiscount = 0;
  if (invoice.additionalDiscount && invoice.additionalDiscount > 0) {
    if (invoice.additionalDiscountType === "percentage") {
      extraDiscount = roundCurrency(baseTaxable * (invoice.additionalDiscount / 100));
    } else {
      extraDiscount = roundCurrency(invoice.additionalDiscount);
    }
    // A fixed header discount can never reduce the taxable value below zero.
    extraDiscount = Math.min(extraDiscount, baseTaxable);
  }

  const discount = roundCurrency(lineDiscountSum + extraDiscount);
  const taxable = roundCurrency(Math.max(0, baseTaxable - extraDiscount));
  // Header discounts reduce GST proportionally: each line's taxable value is
  // scaled by the same factor so CGST/SGST/IGST stay consistent with the
  // discounted taxable amount (DEF-008). Charges are added post-tax.
  const discountFactor = baseTaxable > 0 ? Math.min(1, extraDiscount / baseTaxable) : 0;
  const tax =
    discountFactor === 0
      ? roundCurrency(invoice.items.reduce((sum, line) => sum + lineTax(line), 0))
      : roundCurrency(
          invoice.items.reduce((sum, line) => {
            const discountedTaxable = roundCurrency(lineTaxable(line) * (1 - discountFactor));
            return sum + roundCurrency(discountedTaxable * (line.taxRate / 100));
          }, 0),
        );
  const extraCharges = roundCurrency(Math.max(0, invoice.additionalCharges ?? 0));
  const total = roundCurrency(Math.max(0, taxable + tax + extraCharges));

  const isIgst = invoice.taxMode === "IGST";
  const halfTax = roundCurrency(tax / 2);
  const otherHalf = roundCurrency(tax - halfTax);
  const cgst = isIgst ? 0 : halfTax;
  const sgst = isIgst ? 0 : otherHalf;
  const igst = isIgst ? tax : 0;

  const credited = roundCurrency(invoice.creditedAmount ?? 0);
  const debited = roundCurrency(invoice.debitedAmount ?? 0);
  const allocated = roundCurrency(invoice.allocatedCash ?? 0);
  const effectivePaid = roundCurrency(roundCurrency(invoice.amountPaid) + allocated);
  const result: InvoiceTotals = {
    subtotal,
    discount,
    taxable,
    tax,
    cgst,
    sgst,
    igst,
    total,
    balance: roundCurrency(Math.max(0, total - effectivePaid - credited + debited)),
  };
  if (invoice.creditedAmount !== undefined && invoice.creditedAmount > 0) {
    result.creditedAmount = credited;
  }
  if (invoice.debitedAmount !== undefined && invoice.debitedAmount > 0) {
    result.debitedAmount = debited;
  }
  if (invoice.allocatedCash !== undefined && invoice.allocatedCash > 0) {
    result.allocatedCash = allocated;
  }
  if (invoice.additionalCharges !== undefined && invoice.additionalCharges > 0) {
    result.additionalCharges = extraCharges;
  }
  if (extraDiscount > 0) {
    result.additionalDiscount = extraDiscount;
  }
  return result;
};

export const formatCurrency = (value: number): string => sharedFormatCurrency(value);

export const formatInvoiceDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "Not supplied" : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};

export const validateInvoice = (invoice: Pick<Invoice, "customer" | "issueDate" | "dueDate" | "items">) => {
  const errors: Record<string, string> = {};
  if (!invoice.customer.trim()) errors.customer = "Select a customer before saving.";
  if (!invoice.issueDate) errors.issueDate = "Issue date is required.";
  if (!invoice.dueDate) errors.dueDate = "Due date is required.";
  if (invoice.issueDate && invoice.dueDate && invoice.dueDate < invoice.issueDate) errors.dueDate = "Due date must be on or after issue date.";
  if (invoice.items.length === 0) errors.items = "Add at least one line item.";
  invoice.items.forEach((line, index) => {
    if (!line.item.trim()) errors[`item-${index}`] = "Item or service is required.";
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) errors[`quantity-${index}`] = "Quantity must be greater than zero.";
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) errors[`price-${index}`] = "Enter a valid price.";
    if (!Number.isFinite(line.discount) || line.discount < 0 || line.discount > 100) errors[`discount-${index}`] = "Discount must be 0–100%.";
    if (!Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100) errors[`tax-${index}`] = "Tax rate must be 0–100%.";
  });
  return errors;
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parsePaymentTermsDays = (paymentTerms?: string | null): number => {
  if (!paymentTerms) return 15;
  const normalized = paymentTerms.trim().toLowerCase();
  if (normalized.includes("receipt")) {
    return 0;
  }
  const match = normalized.match(/\b(\d+)\b/);
  if (match && match[1]) {
    const days = parseInt(match[1], 10);
    return Number.isFinite(days) ? days : 15;
  }
  return 15;
};

export const calculateDueDate = (
  issueDate: string,
  paymentTerms?: string | null,
): string => {
  if (!issueDate) return "";
  const days = parsePaymentTermsDays(paymentTerms);
  const parts = issueDate.split("-");
  if (parts.length !== 3) return issueDate;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return issueDate;
  }

  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);

  const resYear = date.getFullYear();
  const resMonth = String(date.getMonth() + 1).padStart(2, "0");
  const resDay = String(date.getDate()).padStart(2, "0");
  return `${resYear}-${resMonth}-${resDay}`;
};
