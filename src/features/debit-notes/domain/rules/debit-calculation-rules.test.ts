import { describe, expect, it } from "vitest";
import {
  calculateDebitAvailability,
  isInvoiceEligibleForDebit,
} from "./debit-calculation-rules";

describe("debit eligibility", () => {
  it("allows Issued, Partially Paid, Paid, and Overdue invoices", () => {
    for (const status of ["Issued", "Partially Paid", "Paid", "Overdue", "ISSUED", "PAID"]) {
      expect(isInvoiceEligibleForDebit(status)).toBe(true);
    }
  });

  it("blocks Draft and Cancelled invoices", () => {
    for (const status of ["Draft", "Cancelled", "DRAFT", "CANCELLED"]) {
      expect(isInvoiceEligibleForDebit(status)).toBe(false);
    }
  });
});

describe("debit availability cap", () => {
  it("allows a debit within the gross invoice cap", () => {
    const result = calculateDebitAvailability({
      invoiceTotal: 11800,
      previouslyDebitedTotal: 2000,
      newDebitTotal: 5000,
    });
    expect(result.isAllowed).toBe(true);
    expect(result.remainingAvailableDebit).toBe(9800);
  });

  it("rejects a zero or negative debit", () => {
    const result = calculateDebitAvailability({
      invoiceTotal: 11800,
      previouslyDebitedTotal: 0,
      newDebitTotal: 0,
    });
    expect(result.isAllowed).toBe(false);
    expect(result.error).toContain("greater than zero");
  });

  it("rejects a debit exceeding the remaining cap", () => {
    const result = calculateDebitAvailability({
      invoiceTotal: 11800,
      previouslyDebitedTotal: 10000,
      newDebitTotal: 5900,
    });
    expect(result.isAllowed).toBe(false);
    expect(result.error).toContain("exceeds remaining debitable balance");
    expect(result.remainingAvailableDebit).toBe(1800);
  });

  it("allows a full-cap debit and then blocks any further debit", () => {
    const full = calculateDebitAvailability({
      invoiceTotal: 11800,
      previouslyDebitedTotal: 0,
      newDebitTotal: 11800,
    });
    expect(full.isAllowed).toBe(true);

    const extra = calculateDebitAvailability({
      invoiceTotal: 11800,
      previouslyDebitedTotal: 11800,
      newDebitTotal: 100,
    });
    expect(extra.isAllowed).toBe(false);
    expect(extra.remainingAvailableDebit).toBe(0);
  });
});
