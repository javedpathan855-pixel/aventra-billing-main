/**
 * Debit Note domain model — sales-side additional billing.
 *
 * A Debit Note records an additional amount receivable from a customer against
 * an original sales invoice (under-billing correction, post-issue additional
 * charges, price revision). It is NOT a payment, NOT a supplier/purchase
 * document (no supplier domain exists), and NEVER marks an invoice PAID.
 * An issued Debit Note increases the invoice's remaining receivable; a Draft
 * has no financial effect.
 */
export type DebitNoteStatus = "Draft" | "Issued" | "Cancelled";
export type TaxMode = "CGST_SGST" | "IGST";

export const DEBIT_NOTE_REASONS = [
  "Under-billing correction",
  "Additional charges after issue",
  "Price revision",
  "Order amendment",
  "Other additional billing",
] as const;

export type DebitNoteReason = (typeof DEBIT_NOTE_REASONS)[number] | string;

export type DebitNoteLineItem = {
  id: string;
  invoiceItemId?: string;
  productId?: string;
  item: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type DebitNote = {
  id: string;
  debitNoteNumber: string;
  invoiceId: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  customerPlaceOfSupply?: string;
  issueDate: string;
  status: DebitNoteStatus;
  reason: string;
  taxMode: TaxMode;
  currency: string;
  subtotal: number;
  lineDiscountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  notes: string;
  terms: string;
  items: DebitNoteLineItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type DebitNoteTotals = {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

export const canEditDebitNote = (status: DebitNoteStatus): boolean => status === "Draft";

export const canIssueDebitNote = (status: DebitNoteStatus): boolean => status === "Draft";

// Single authoritative money implementation lives in shared/lib;
// this domain re-exports the names its consumers already import.
import { formatCurrency, roundCurrency as sharedRoundCurrency } from "@/shared/lib/money";
export const roundCurrency = (value: number): number => sharedRoundCurrency(value);

export const lineSubtotal = (line: Pick<DebitNoteLineItem, "quantity" | "unitPrice">): number =>
  roundCurrency(line.quantity * line.unitPrice);

export const lineDiscount = (
  line: Pick<DebitNoteLineItem, "quantity" | "unitPrice" | "discount">,
): number => roundCurrency(lineSubtotal(line) * (line.discount / 100));

export const lineTaxable = (
  line: Pick<DebitNoteLineItem, "quantity" | "unitPrice" | "discount">,
): number => roundCurrency(lineSubtotal(line) - lineDiscount(line));

export const lineTax = (
  line: Pick<DebitNoteLineItem, "quantity" | "unitPrice" | "discount" | "taxRate">,
): number => roundCurrency(lineTaxable(line) * (line.taxRate / 100));

export const calculateDebitNoteTotals = ({
  items,
  taxMode = "CGST_SGST",
}: {
  items: DebitNoteLineItem[];
  taxMode?: TaxMode;
}): DebitNoteTotals => {
  const subtotal = roundCurrency(items.reduce((sum, line) => sum + lineSubtotal(line), 0));
  const discount = roundCurrency(items.reduce((sum, line) => sum + lineDiscount(line), 0));
  const taxable = roundCurrency(items.reduce((sum, line) => sum + lineTaxable(line), 0));
  const tax = roundCurrency(items.reduce((sum, line) => sum + lineTax(line), 0));
  const total = roundCurrency(taxable + tax);

  const isIgst = taxMode === "IGST";
  const halfTax = roundCurrency(tax / 2);
  const otherHalf = roundCurrency(tax - halfTax);
  const cgst = isIgst ? 0 : halfTax;
  const sgst = isIgst ? 0 : otherHalf;
  const igst = isIgst ? tax : 0;

  return {
    subtotal,
    discount,
    taxable,
    tax,
    cgst,
    sgst,
    igst,
    total,
  };
};

export const formatDebitNoteCurrency = (value: number): string => formatCurrency(value);

export const formatDebitNoteDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? "Not supplied"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
};

export const validateDebitNote = (
  note: Pick<DebitNote, "invoiceId" | "issueDate" | "reason" | "items">,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!note.invoiceId.trim()) errors.invoiceId = "Select an original invoice to debit.";
  if (!note.issueDate) errors.issueDate = "Issue date is required.";
  if (!note.reason.trim()) errors.reason = "A reason is required.";
  if (note.items.length === 0) errors.items = "Add at least one line item to debit.";
  return errors;
};

export const validateDebitNoteLineItems = (
  items: readonly DebitNoteLineItem[],
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!items || items.length === 0) {
    errors.items = "Add at least one line item to debit.";
    return errors;
  }

  items.forEach((line, index) => {
    if (!line.item.trim()) {
      errors[`item-${index}`] = "Item or description is required.";
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      errors[`quantity-${index}`] = "Quantity must be greater than zero.";
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      errors[`price-${index}`] = "Enter a valid unit price.";
    }
    if (!Number.isFinite(line.discount) || line.discount < 0 || line.discount > 100) {
      errors[`discount-${index}`] = "Discount must be between 0% and 100%.";
    }
    if (!Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100) {
      errors[`tax-${index}`] = "Tax rate must be between 0% and 100%.";
    }
  });

  return errors;
};
