import { describe, expect, it } from "vitest";
import {
  allocatedTotal,
  canReversePayment,
  formatPaymentDate,
  unallocatedTotal,
  validatePaymentAllocations,
} from "./payment";

describe("payment cash math", () => {
  it("sums allocations and derives the unallocated remainder", () => {
    const allocations = [
      { amount: 4000 },
      { amount: 6000 },
    ];
    expect(allocatedTotal(allocations)).toBe(10000);
    expect(unallocatedTotal(10000, allocations)).toBe(0);
    expect(unallocatedTotal(12000, allocations)).toBe(2000);
    expect(unallocatedTotal(5000, allocations)).toBe(0);
  });

  it("allows reversal only from Active", () => {
    expect(canReversePayment("Active")).toBe(true);
    expect(canReversePayment("Reversed")).toBe(false);
  });

  it("formats payment dates like the rest of billing", () => {
    expect(formatPaymentDate("2026-10-15")).toContain("2026");
    expect(formatPaymentDate("garbage")).toBe("Not supplied");
  });
});

describe("allocation validation", () => {
  it("requires at least one allocation", () => {
    expect(validatePaymentAllocations([]).allocations).toBeTruthy();
  });

  it("rejects blank invoices, duplicates, and non-positive amounts", () => {
    expect(
      validatePaymentAllocations([{ invoiceId: "", amount: 100 }])["invoice-0"],
    ).toBeTruthy();
    expect(
      validatePaymentAllocations([
        { invoiceId: "inv-1", amount: 100 },
        { invoiceId: "inv-1", amount: 50 },
      ])["invoice-1"],
    ).toBeTruthy();
    expect(
      validatePaymentAllocations([{ invoiceId: "inv-1", amount: 0 }])["amount-0"],
    ).toBeTruthy();
    expect(
      validatePaymentAllocations([{ invoiceId: "inv-1", amount: -5 }])["amount-0"],
    ).toBeTruthy();
  });

  it("accepts distinct positive allocations", () => {
    expect(
      validatePaymentAllocations([
        { invoiceId: "inv-1", amount: 4000 },
        { invoiceId: "inv-2", amount: 6000 },
      ]),
    ).toEqual({});
  });
});
