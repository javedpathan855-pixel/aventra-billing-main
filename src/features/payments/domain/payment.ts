/**
 * Customer payment domain — real cash receipts, never to be confused with
 * credit/debit adjustments or the legacy invoice-level `amountPaid` tender.
 *
 * Effective cash on an invoice = legacy `amountPaid` (frozen manual tender
 * recorded at document creation, still counted exactly as before) + active
 * payment allocations. No backfill was ever created from `amountPaid`, so
 * nothing is double-counted; allocation guards cap the combined cash at the
 * net obligation.
 */
export type PaymentStatus = "Active" | "Reversed";
export type PaymentMethod = "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Card" | "Other";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Card",
  "Other",
];

export type PaymentAllocationLine = {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount: number;
};

export type Payment = {
  id: string;
  organizationId: string;
  customerId?: string;
  customerName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string;
  notes: string;
  status: PaymentStatus;
  reversedAt?: string;
  reversalReason?: string;
  reversedBy?: string;
  idempotencyKey?: string;
  createdBy?: string;
  allocations: PaymentAllocationLine[];
  createdAt?: string;
  updatedAt?: string;
};

// Single authoritative money implementation lives in shared/lib;
// this domain re-exports the names its consumers already import.
import { formatCurrency, roundCurrency as sharedRoundCurrency } from "@/shared/lib/money";
export const roundCurrency = (value: number): number => sharedRoundCurrency(value);
export { formatCurrency };

export const canReversePayment = (status: PaymentStatus): boolean => status === "Active";

export const allocatedTotal = (allocations: ReadonlyArray<Pick<PaymentAllocationLine, "amount">>): number =>
  roundCurrency(allocations.reduce((sum, line) => sum + line.amount, 0));

export const unallocatedTotal = (
  paymentAmount: number,
  allocations: ReadonlyArray<Pick<PaymentAllocationLine, "amount">>,
): number => roundCurrency(Math.max(0, roundCurrency(paymentAmount) - allocatedTotal(allocations)));

export const formatPaymentDate = (value: string): string => {
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

export const validatePaymentAllocations = (
  items: ReadonlyArray<{ invoiceId: string; amount: number }>,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!items || items.length === 0) {
    errors.allocations = "Allocate the payment to at least one invoice.";
    return errors;
  }

  const seen = new Set<string>();
  items.forEach((line, index) => {
    if (!line.invoiceId.trim()) {
      errors[`invoice-${index}`] = "Select an invoice for this allocation.";
    } else if (seen.has(line.invoiceId)) {
      errors[`invoice-${index}`] = "Each invoice may appear only once per payment.";
    } else {
      seen.add(line.invoiceId);
    }
    if (!Number.isFinite(line.amount) || line.amount <= 0) {
      errors[`amount-${index}`] = "Allocation amount must be greater than zero.";
    }
  });

  return errors;
};
