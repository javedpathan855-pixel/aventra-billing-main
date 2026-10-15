import { describe, expect, it } from "vitest";
import {
  assertReturnableQuantity,
  assertValidPurchaseReturnStatusTransition,
  calculatePurchaseReturnLineTotals,
  calculatePurchaseReturnTotals,
  calculateRemainingReturnableQuantity,
  canDeletePurchaseReturn,
  canTransitionPurchaseReturnStatus,
} from "./purchase-return-rules";
import {
  InvalidPurchaseReturnStatusTransitionError,
  OverReturnError,
  PurchaseReturnDomainError,
} from "../errors/purchase-return-errors";

describe("purchase-return totals calculation", () => {
  it("calculates exact totals for returned lines", () => {
    const totals = calculatePurchaseReturnTotals([
      { returnQuantity: 2, unitPrice: 50000, discount: 5, taxRate: 18 },
    ]);

    expect(totals.subtotal).toBe(95000);
    expect(totals.taxAmount).toBe(17100);
    expect(totals.totalAmount).toBe(112100);
  });

  it("sums multiple lines with mixed tax rates", () => {
    const totals = calculatePurchaseReturnTotals([
      { returnQuantity: 1, unitPrice: 1000, discount: 0, taxRate: 5 },
      { returnQuantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 },
    ]);

    expect(totals.subtotal).toBe(2000);
    expect(totals.taxAmount).toBe(230);
    expect(totals.totalAmount).toBe(2230);
  });

  it("computes per-line taxable, tax, and total", () => {
    expect(
      calculatePurchaseReturnLineTotals({
        quantity: 3,
        unitPrice: 100,
        discount: 10,
        taxRate: 18,
      }),
    ).toEqual({ taxableAmount: 270, taxAmount: 48.6, lineTotal: 318.6 });
  });
});

describe("remaining returnable quantities", () => {
  it("subtracts previously returned quantities with 3dp precision", () => {
    expect(calculateRemainingReturnableQuantity(10, 4)).toBe(6);
    expect(calculateRemainingReturnableQuantity(10, 10)).toBe(0);
    expect(calculateRemainingReturnableQuantity(5, 9)).toBe(0);
  });

  it("accepts quantities within the remaining balance", () => {
    expect(() => assertReturnableQuantity("Steel Rods", 6, 6)).not.toThrow();
    expect(() => assertReturnableQuantity("Steel Rods", 1, 6)).not.toThrow();
  });

  it("rejects zero and over-remaining quantities", () => {
    expect(() => assertReturnableQuantity("Steel Rods", 0, 6)).toThrow(
      PurchaseReturnDomainError,
    );
    expect(() => assertReturnableQuantity("Steel Rods", 7, 6)).toThrow(
      OverReturnError,
    );
  });
});

describe("purchase-return lifecycle transitions and guards", () => {
  it("allows the supported transitions", () => {
    expect(canTransitionPurchaseReturnStatus("DRAFT", "APPROVED")).toBe(true);
    expect(canTransitionPurchaseReturnStatus("DRAFT", "CANCELLED")).toBe(true);
    expect(canTransitionPurchaseReturnStatus("APPROVED", "COMPLETED")).toBe(true);
    expect(canTransitionPurchaseReturnStatus("APPROVED", "CANCELLED")).toBe(true);
    expect(canTransitionPurchaseReturnStatus("DRAFT", "DRAFT")).toBe(true);
  });

  it("rejects completion from draft and any exit from terminal states", () => {
    expect(canTransitionPurchaseReturnStatus("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransitionPurchaseReturnStatus("APPROVED", "DRAFT")).toBe(false);
    expect(canTransitionPurchaseReturnStatus("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionPurchaseReturnStatus("CANCELLED", "APPROVED")).toBe(false);

    expect(() =>
      assertValidPurchaseReturnStatusTransition("DRAFT", "COMPLETED"),
    ).toThrow(InvalidPurchaseReturnStatusTransitionError);
  });

  it("allows deletion of Draft returns only", () => {
    expect(canDeletePurchaseReturn("DRAFT")).toBe(true);
    expect(canDeletePurchaseReturn("APPROVED")).toBe(false);
    expect(canDeletePurchaseReturn("COMPLETED")).toBe(false);
    expect(canDeletePurchaseReturn("CANCELLED")).toBe(false);
  });
});
