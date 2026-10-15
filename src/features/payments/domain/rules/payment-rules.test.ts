import { describe, expect, it } from "vitest";
import {
  calculateAllocationAvailability,
  isInvoiceEligibleForPayment,
} from "./payment-rules";

describe("payment eligibility", () => {
  it("allows billable invoice statuses", () => {
    for (const status of ["Issued", "Partially Paid", "Paid", "Overdue"]) {
      expect(isInvoiceEligibleForPayment(status)).toBe(true);
    }
  });

  it("blocks drafts and cancelled invoices", () => {
    for (const status of ["Draft", "Cancelled"]) {
      expect(isInvoiceEligibleForPayment(status)).toBe(false);
    }
  });
});

describe("allocation availability", () => {
  const base = {
    invoiceTotal: 10000,
    legacyPaid: 0,
    previouslyAllocated: 0,
    creditedTotal: 0,
    debitedTotal: 0,
  };

  it("allows an allocation within the remaining balance", () => {
    const result = calculateAllocationAvailability({ ...base, newAllocation: 4000 });
    expect(result.isAllowed).toBe(true);
    expect(result.remainingBalance).toBe(10000);
  });

  it("counts legacy cash and prior allocations against the cap", () => {
    const result = calculateAllocationAvailability({
      ...base,
      legacyPaid: 4000,
      previouslyAllocated: 3000,
      newAllocation: 3000,
    });
    expect(result.isAllowed).toBe(true);
    expect(result.remainingBalance).toBe(3000);
  });

  it("subtracts credits and adds debits to the obligation", () => {
    const result = calculateAllocationAvailability({
      ...base,
      creditedTotal: 2000,
      debitedTotal: 1000,
      newAllocation: 9000,
    });
    expect(result.isAllowed).toBe(true);
    expect(result.remainingBalance).toBe(9000);
  });

  it("rejects over-allocation and non-positive amounts", () => {
    expect(
      calculateAllocationAvailability({ ...base, newAllocation: 10001 }).isAllowed,
    ).toBe(false);
    expect(
      calculateAllocationAvailability({ ...base, newAllocation: 0 }).isAllowed,
    ).toBe(false);
    expect(
      calculateAllocationAvailability({ ...base, newAllocation: -50 }).isAllowed,
    ).toBe(false);
  });
});
