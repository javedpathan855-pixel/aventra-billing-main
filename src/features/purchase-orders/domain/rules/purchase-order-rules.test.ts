import { describe, expect, it } from "vitest";
import {
  calculatePurchaseOrderTotals,
  validatePurchaseOrderLines,
  calculateExpectedDeliveryDate,
} from "./purchase-order-rules";
import { InvalidPurchaseOrderLineError } from "../errors/purchase-order-errors";

describe("purchase-order totals calculation", () => {
  it("calculates exact totals for a single line with CGST/SGST split", () => {
    const totals = calculatePurchaseOrderTotals({
      items: [{ quantity: 2, unitPrice: 50000, discount: 5, taxRate: 18 }],
      taxMode: "CGST_SGST",
      additionalCharges: 1000,
      additionalDiscount: 1000,
      additionalDiscountType: "fixed",
    });

    expect(totals.subtotal).toBe(100000);
    expect(totals.lineDiscountTotal).toBe(5000);
    expect(totals.effectiveAdditionalDiscount).toBe(1000);
    expect(totals.additionalCharges).toBe(1000);
    expect(totals.taxableAmount).toBe(95000);
    expect(totals.cgst).toBe(8550);
    expect(totals.sgst).toBe(8550);
    expect(totals.igst).toBe(0);
    expect(totals.totalTax).toBe(17100);
    expect(totals.total).toBe(112100);
  });

  it("applies percentage order discount against the post-line-discount base", () => {
    const totals = calculatePurchaseOrderTotals({
      items: [{ quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
      taxMode: "CGST_SGST",
      additionalDiscount: 10,
      additionalDiscountType: "percentage",
    });

    expect(totals.effectiveAdditionalDiscount).toBe(100);
    expect(totals.taxableAmount).toBe(900);
    expect(totals.totalTax).toBe(162);
    expect(totals.total).toBe(1062);
  });

  it("routes the full tax amount to IGST in inter-state mode", () => {
    const totals = calculatePurchaseOrderTotals({
      items: [{ quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
      taxMode: "IGST",
    });

    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
    expect(totals.igst).toBe(180);
    expect(totals.total).toBe(1180);
  });

  it("distributes totals across multiple tax slabs", () => {
    const totals = calculatePurchaseOrderTotals({
      items: [
        { quantity: 1, unitPrice: 1000, discount: 0, taxRate: 5 },
        { quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 },
      ],
      taxMode: "CGST_SGST",
    });

    expect(totals.subtotal).toBe(2000);
    expect(totals.taxBreakdown).toHaveLength(2);
    expect(totals.taxBreakdown[0].rate).toBe(5);
    expect(totals.taxBreakdown[1].rate).toBe(18);
    expect(totals.totalTax).toBe(230);
    expect(totals.total).toBe(2230);
  });

  it("tracks receiving progress without affecting financial totals", () => {
    const totals = calculatePurchaseOrderTotals({
      items: [
        { quantity: 10, unitPrice: 100, receivedQuantity: 4 },
        { quantity: 5, unitPrice: 200, receivedQuantity: 5 },
      ],
      taxMode: "CGST_SGST",
    });

    expect(totals.totalOrderedQuantity).toBe(15);
    expect(totals.totalReceivedQuantity).toBe(9);
    expect(totals.totalRemainingQuantity).toBe(6);
    expect(totals.receivingPercentage).toBe(60);
  });
});

describe("purchase-order line validation", () => {
  it("accepts valid line items", () => {
    expect(() =>
      validatePurchaseOrderLines([
        { item: "Steel Rods", quantity: 10, unitPrice: 500, discount: 5, taxRate: 18 },
      ]),
    ).not.toThrow();
  });

  it("rejects an empty line-item list", () => {
    expect(() => validatePurchaseOrderLines([])).toThrow(
      InvalidPurchaseOrderLineError,
    );
  });

  it("rejects blank item names, non-positive quantities, and negative prices", () => {
    expect(() =>
      validatePurchaseOrderLines([{ item: "  ", quantity: 1, unitPrice: 10 }]),
    ).toThrow(InvalidPurchaseOrderLineError);
    expect(() =>
      validatePurchaseOrderLines([{ item: "Bolts", quantity: 0, unitPrice: 10 }]),
    ).toThrow(InvalidPurchaseOrderLineError);
    expect(() =>
      validatePurchaseOrderLines([{ item: "Bolts", quantity: 1, unitPrice: -5 }]),
    ).toThrow(InvalidPurchaseOrderLineError);
  });

  it("rejects out-of-range discount and tax rates", () => {
    expect(() =>
      validatePurchaseOrderLines([
        { item: "Bolts", quantity: 1, unitPrice: 10, discount: 101 },
      ]),
    ).toThrow(InvalidPurchaseOrderLineError);
    expect(() =>
      validatePurchaseOrderLines([
        { item: "Bolts", quantity: 1, unitPrice: 10, taxRate: -1 },
      ]),
    ).toThrow(InvalidPurchaseOrderLineError);
  });

  it("rejects received quantities exceeding the ordered quantity", () => {
    expect(() =>
      validatePurchaseOrderLines([
        { item: "Bolts", quantity: 10, unitPrice: 10, receivedQuantity: 11 },
      ]),
    ).toThrow(InvalidPurchaseOrderLineError);
  });
});

describe("purchase-order delivery date helper", () => {
  it("adds delivery days to the order date", () => {
    expect(calculateExpectedDeliveryDate("2026-10-01", 15)).toBe("2026-10-16");
  });
});
