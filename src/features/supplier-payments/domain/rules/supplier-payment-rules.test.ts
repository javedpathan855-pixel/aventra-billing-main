import { describe, expect, it } from "vitest";
import {
  allocatedTotal,
  canReverseSupplierPayment,
  unallocatedTotal,
  validateSupplierPaymentAllocations,
} from "../supplier-payment";
import {
  calculateAllocationAvailability,
  getTodayDateString,
  isBillEligibleForPayment,
} from "./supplier-payment-rules";

describe("supplier payment allocation helpers", () => {
  it("sums allocation lines with currency rounding", () => {
    expect(allocatedTotal([{ amount: 100.5 }, { amount: 200.25 }])).toBe(300.75);
    expect(unallocatedTotal(500, [{ amount: 300.75 }])).toBe(199.25);
  });

  it("validates allocation structure", () => {
    expect(validateSupplierPaymentAllocations([])).toEqual({
      allocations: expect.any(String),
    });
    expect(
      validateSupplierPaymentAllocations([
        { purchaseBillId: "pb-1", amount: 100 },
        { purchaseBillId: "pb-1", amount: 50 },
      ])["bill-1"],
    ).toContain("only once");
    expect(
      validateSupplierPaymentAllocations([{ purchaseBillId: "pb-1", amount: 0 }])[
        "amount-0"
      ],
    ).toContain("greater than zero");
    expect(
      validateSupplierPaymentAllocations([{ purchaseBillId: "pb-1", amount: 100 }]),
    ).toEqual({});
  });

  it("allows reversal of Active payments only", () => {
    expect(canReverseSupplierPayment("Active")).toBe(true);
    expect(canReverseSupplierPayment("Reversed")).toBe(false);
  });

  it("returns today in YYYY-MM-DD format", () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("bill payment eligibility and availability", () => {
  it("treats only Confirmed bills as payable", () => {
    expect(isBillEligibleForPayment("Confirmed")).toBe(true);
    expect(isBillEligibleForPayment("Draft")).toBe(false);
    expect(isBillEligibleForPayment("Cancelled")).toBe(false);
  });

  it("allows allocations within the outstanding balance", () => {
    expect(
      calculateAllocationAvailability({
        billTotal: 1180,
        previouslyAllocated: 180,
        newAllocation: 1000,
      }),
    ).toEqual({ isAllowed: true, remainingBalance: 1000 });
  });

  it("rejects over-allocations and non-positive amounts", () => {
    const over = calculateAllocationAvailability({
      billTotal: 1180,
      previouslyAllocated: 180,
      newAllocation: 1000.01,
    });
    expect(over.isAllowed).toBe(false);
    expect(over.remainingBalance).toBe(1000);

    const zero = calculateAllocationAvailability({
      billTotal: 1180,
      previouslyAllocated: 0,
      newAllocation: 0,
    });
    expect(zero.isAllowed).toBe(false);
  });

  it("floors outstanding at zero", () => {
    const full = calculateAllocationAvailability({
      billTotal: 100,
      previouslyAllocated: 150,
      newAllocation: 1,
    });
    expect(full.remainingBalance).toBe(0);
    expect(full.isAllowed).toBe(false);
  });
});
