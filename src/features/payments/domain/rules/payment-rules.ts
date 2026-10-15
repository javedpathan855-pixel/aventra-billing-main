import { roundCurrency } from "../payment";

export const ELIGIBLE_INVOICE_STATUSES = [
  "Issued",
  "Partially Paid",
  "Paid",
  "Overdue",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
] as const;

export const isInvoiceEligibleForPayment = (status: string): boolean => {
  const normalized = status.trim();
  return ELIGIBLE_INVOICE_STATUSES.some(
    (s) => s.toLowerCase() === normalized.toLowerCase(),
  );
};

export type AllocationCheck = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  legacyPaid: number;
  previouslyAllocated: number;
  creditedTotal: number;
  debitedTotal: number;
  remainingBalance: number;
  newAllocation: number;
};

/**
 * Remaining balance an invoice can still receive, given every authoritative
 * cash and adjustment source. Legacy `amountPaid` counts exactly as before;
 * active allocations add to it; the combined cash can never exceed the net
 * obligation (total − credits + debits).
 */
export const calculateAllocationAvailability = ({
  invoiceTotal,
  legacyPaid,
  previouslyAllocated,
  creditedTotal,
  debitedTotal,
  newAllocation,
}: {
  invoiceTotal: number;
  legacyPaid: number;
  previouslyAllocated: number;
  creditedTotal: number;
  debitedTotal: number;
  newAllocation: number;
}): { isAllowed: boolean; remainingBalance: number; error?: string } => {
  const obligation = roundCurrency(
    roundCurrency(invoiceTotal) - roundCurrency(creditedTotal) + roundCurrency(debitedTotal),
  );
  const committed = roundCurrency(roundCurrency(legacyPaid) + roundCurrency(previouslyAllocated));
  const remainingBalance = roundCurrency(Math.max(0, obligation - committed));
  const roundedNew = roundCurrency(newAllocation);

  if (roundedNew <= 0) {
    return {
      isAllowed: false,
      remainingBalance,
      error: "Allocation amount must be greater than zero.",
    };
  }

  if (roundedNew > remainingBalance + 0.001) {
    return {
      isAllowed: false,
      remainingBalance,
      error: `Allocation exceeds the outstanding balance (${remainingBalance.toFixed(2)}).`,
    };
  }

  return { isAllowed: true, remainingBalance };
};
