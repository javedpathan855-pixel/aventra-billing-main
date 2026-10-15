import { roundCurrency } from "../supplier-payment";

export const ELIGIBLE_BILL_STATUSES = ["Confirmed", "CONFIRMED"] as const;

/**
 * Only posted (Confirmed) purchase bills can receive payments. Draft bills
 * are not obligations yet; Cancelled bills are void. Bills carry no paid
 * states, so eligibility is a pure function of confirmation.
 */
export const isBillEligibleForPayment = (status: string): boolean => {
  const normalized = status.trim();
  return ELIGIBLE_BILL_STATUSES.some(
    (s) => s.toLowerCase() === normalized.toLowerCase(),
  );
};

/**
 * Outstanding balance a purchase bill can still receive, given the
 * authoritative bill total and active allocations. Purchase bills have no
 * legacy tender, credit, or debit adjustments, so outstanding is simply
 * total minus active allocations, floored at zero.
 */
export const calculateAllocationAvailability = ({
  billTotal,
  previouslyAllocated,
  newAllocation,
}: {
  billTotal: number;
  previouslyAllocated: number;
  newAllocation: number;
}): { isAllowed: boolean; remainingBalance: number; error?: string } => {
  const obligation = roundCurrency(billTotal);
  const committed = roundCurrency(previouslyAllocated);
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

export const getTodayDateString = (): string =>
  new Date().toISOString().split("T")[0];
