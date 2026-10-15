import { roundCurrency } from "../debit-note";

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

export const isInvoiceEligibleForDebit = (status: string): boolean => {
  const normalized = status.trim();
  return ELIGIBLE_INVOICE_STATUSES.some(
    (s) => s.toLowerCase() === normalized.toLowerCase(),
  );
};

export type DebitAvailabilityResult = {
  isAllowed: boolean;
  invoiceTotal: number;
  previouslyDebitedTotal: number;
  remainingAvailableDebit: number;
  newDebitTotal: number;
  error?: string;
};

/**
 * Maximum Debit Note amount against the original invoice.
 * Capped by the gross invoice total minus prior valid issued debits —
 * symmetric with the credit cap. A debit increases the receivable, so an
 * unbounded policy would let anyone inflate receivables without limit; the
 * cap keeps adjustments proportionate to the source document while remaining
 * independent of cash received. Server-computed only — never trust a
 * client-provided amount. Recheck inside the issuance transaction under row
 * lock to prevent concurrent over-debiting.
 */
export const calculateDebitAvailability = ({
  invoiceTotal,
  previouslyDebitedTotal,
  newDebitTotal,
}: {
  invoiceTotal: number;
  previouslyDebitedTotal: number;
  newDebitTotal: number;
}): DebitAvailabilityResult => {
  const roundedInvoiceTotal = roundCurrency(invoiceTotal);
  const roundedPreviousDebit = roundCurrency(previouslyDebitedTotal);
  const remainingAvailable = roundCurrency(
    Math.max(0, roundedInvoiceTotal - roundedPreviousDebit),
  );
  const roundedNewDebit = roundCurrency(newDebitTotal);

  if (roundedNewDebit <= 0) {
    return {
      isAllowed: false,
      invoiceTotal: roundedInvoiceTotal,
      previouslyDebitedTotal: roundedPreviousDebit,
      remainingAvailableDebit: remainingAvailable,
      newDebitTotal: roundedNewDebit,
      error: "Debit note total must be greater than zero.",
    };
  }

  // Use EPSILON / 1-cent tolerance to avoid float boundary precision false positives
  const exceeds = roundedNewDebit > remainingAvailable + 0.001;

  if (exceeds) {
    return {
      isAllowed: false,
      invoiceTotal: roundedInvoiceTotal,
      previouslyDebitedTotal: roundedPreviousDebit,
      remainingAvailableDebit: remainingAvailable,
      newDebitTotal: roundedNewDebit,
      error: `Debit note amount (₹${roundedNewDebit.toFixed(2)}) exceeds remaining debitable balance (₹${remainingAvailable.toFixed(2)}).`,
    };
  }

  return {
    isAllowed: true,
    invoiceTotal: roundedInvoiceTotal,
    previouslyDebitedTotal: roundedPreviousDebit,
    remainingAvailableDebit: remainingAvailable,
    newDebitTotal: roundedNewDebit,
  };
};
