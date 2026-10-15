import { describe, expect, it } from "vitest";
import {
  canTransitionReturnStatus,
  assertValidReturnStatusTransition,
  calculateRemainingReturnableQuantity,
  assertReturnableQuantity,
  assertReceivableQuantity,
  calculateReturnLineTotals,
  calculateReturnTotals,
} from "./sales-return-rules";
import {
  InvalidReturnStatusTransitionError,
  OverReceiptError,
  OverReturnError,
  SalesReturnDomainError,
} from "../errors/sales-return-errors";

describe("Sales Return Domain Rules", () => {
  describe("Status Transitions", () => {
    it("allows valid transitions from DRAFT", () => {
      expect(canTransitionReturnStatus("DRAFT", "APPROVED")).toBe(true);
      expect(canTransitionReturnStatus("DRAFT", "CANCELLED")).toBe(true);
      expect(canTransitionReturnStatus("DRAFT", "DRAFT")).toBe(true);
      expect(canTransitionReturnStatus("DRAFT", "COMPLETED")).toBe(false);
    });

    it("allows valid transitions from APPROVED", () => {
      expect(canTransitionReturnStatus("APPROVED", "COMPLETED")).toBe(true);
      expect(canTransitionReturnStatus("APPROVED", "CANCELLED")).toBe(true);
      expect(canTransitionReturnStatus("APPROVED", "DRAFT")).toBe(false);
    });

    it("blocks transitions from COMPLETED or CANCELLED", () => {
      expect(canTransitionReturnStatus("COMPLETED", "DRAFT")).toBe(false);
      expect(canTransitionReturnStatus("COMPLETED", "APPROVED")).toBe(false);
      expect(canTransitionReturnStatus("CANCELLED", "DRAFT")).toBe(false);
    });

    it("throws InvalidReturnStatusTransitionError when invalid transition attempted", () => {
      expect(() => assertValidReturnStatusTransition("DRAFT", "COMPLETED")).toThrow(
        InvalidReturnStatusTransitionError,
      );
      expect(() => assertValidReturnStatusTransition("COMPLETED", "DRAFT")).toThrow(
        InvalidReturnStatusTransitionError,
      );
    });
  });

  describe("Quantity & Over-return Validation", () => {
    it("calculates remaining returnable quantity accurately", () => {
      expect(calculateRemainingReturnableQuantity(50, 20)).toBe(30);
      expect(calculateRemainingReturnableQuantity(10, 10)).toBe(0);
      expect(calculateRemainingReturnableQuantity(5, 10)).toBe(0);
    });

    it("allows return within remaining bounds", () => {
      expect(() => assertReturnableQuantity("Product X", 5, 10)).not.toThrow();
      expect(() => assertReturnableQuantity("Product X", 10, 10)).not.toThrow();
    });

    it("throws on non-positive return quantities", () => {
      expect(() => assertReturnableQuantity("Product X", 0, 10)).toThrow(
        SalesReturnDomainError,
      );
      expect(() => assertReturnableQuantity("Product X", -2, 10)).toThrow(
        SalesReturnDomainError,
      );
    });

    it("throws OverReturnError when return quantity exceeds remaining quantity", () => {
      expect(() => assertReturnableQuantity("Product X", 15, 10)).toThrow(
        OverReturnError,
      );
    });

    it("allows receipt within returned bounds", () => {
      expect(() => assertReceivableQuantity("Product X", 5, 10)).not.toThrow();
      expect(() => assertReceivableQuantity("Product X", 10, 10)).not.toThrow();
    });

    it("throws on negative received quantities", () => {
      expect(() => assertReceivableQuantity("Product X", -1, 10)).toThrow(
        SalesReturnDomainError,
      );
    });

    it("throws OverReceiptError when receipt exceeds returned quantity", () => {
      expect(() => assertReceivableQuantity("Product X", 11, 10)).toThrow(
        OverReceiptError,
      );
    });
  });

  describe("Line and Return Totals Calculations", () => {
    it("calculates single line totals with discount and tax accurately", () => {
      // 2 units * 1000 = 2000, 10% discount = 200, taxable = 1800, 18% tax = 324, lineTotal = 2124
      const result = calculateReturnLineTotals({
        quantity: 2,
        unitPrice: 1000,
        discount: 10,
        taxRate: 18,
      });

      expect(result.taxableAmount).toBe(1800);
      expect(result.taxAmount).toBe(324);
      expect(result.lineTotal).toBe(2124);
    });

    it("calculates full return totals across multiple items", () => {
      const items = [
        { returnQuantity: 2, unitPrice: 1000, discount: 10, taxRate: 18 }, // taxable 1800, tax 324
        { returnQuantity: 1, unitPrice: 500, discount: 0, taxRate: 18 }, // taxable 500, tax 90
      ];

      const totals = calculateReturnTotals(items);
      expect(totals.subtotal).toBe(2300);
      expect(totals.taxAmount).toBe(414);
      expect(totals.totalAmount).toBe(2714);
    });
  });
});
