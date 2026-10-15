/**
 * Supplier payment domain — real cash paid out to suppliers, allocated
 * against posted purchase bills. Mirrors the customer-payments model:
 * a payment is fully allocated at creation (overpayment rejected),
 * allocations are immutable, and reversal is a state transition.
 *
 * A payment never changes a bill's status: bills have no paid states, and
 * outstanding balances are always recomputed from active allocations.
 */
export type SupplierPaymentStatus = "Active" | "Reversed";
export type SupplierPaymentMethod =
  | "Cash"
  | "Bank Transfer"
  | "UPI"
  | "Cheque"
  | "Card"
  | "Other";

export const SUPPLIER_PAYMENT_METHODS: SupplierPaymentMethod[] = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Card",
  "Other",
];

export type SupplierPaymentAllocationLine = {
  id: string;
  purchaseBillId: string;
  billNumber?: string;
  amount: number;
};

export type SupplierPayment = {
  id: string;
  organizationId: string;
  supplierId?: string;
  supplierName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: SupplierPaymentMethod;
  reference?: string;
  notes: string;
  status: SupplierPaymentStatus;
  reversedAt?: string;
  reversalReason?: string;
  reversedBy?: string;
  idempotencyKey?: string;
  createdBy?: string;
  allocations: SupplierPaymentAllocationLine[];
  createdAt?: string;
  updatedAt?: string;
};

import { formatCurrency, roundCurrency as sharedRoundCurrency } from "@/shared/lib/money";
export const roundCurrency = (value: number): number => sharedRoundCurrency(value);
export { formatCurrency };

export const canReverseSupplierPayment = (
  status: SupplierPaymentStatus,
): boolean => status === "Active";

export const allocatedTotal = (
  allocations: ReadonlyArray<Pick<SupplierPaymentAllocationLine, "amount">>,
): number => roundCurrency(allocations.reduce((sum, line) => sum + line.amount, 0));

export const unallocatedTotal = (
  paymentAmount: number,
  allocations: ReadonlyArray<Pick<SupplierPaymentAllocationLine, "amount">>,
): number =>
  roundCurrency(
    Math.max(0, roundCurrency(paymentAmount) - allocatedTotal(allocations)),
  );

export const validateSupplierPaymentAllocations = (
  items: ReadonlyArray<{ purchaseBillId: string; amount: number }>,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!items || items.length === 0) {
    errors.allocations = "Allocate the payment to at least one purchase bill.";
    return errors;
  }

  const seen = new Set<string>();
  items.forEach((line, index) => {
    if (!line.purchaseBillId.trim()) {
      errors[`bill-${index}`] = "Select a purchase bill for this allocation.";
    } else if (seen.has(line.purchaseBillId)) {
      errors[`bill-${index}`] = "Each purchase bill may appear only once per payment.";
    } else {
      seen.add(line.purchaseBillId);
    }
    if (!Number.isFinite(line.amount) || line.amount <= 0) {
      errors[`amount-${index}`] = "Allocation amount must be greater than zero.";
    }
  });

  return errors;
};
