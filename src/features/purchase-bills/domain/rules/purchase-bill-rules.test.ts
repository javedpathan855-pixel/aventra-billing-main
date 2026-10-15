import { describe, expect, it } from "vitest";
import {
  calculatePurchaseBillTotals,
  validatePurchaseBillLines,
  validatePurchaseBillDates,
  calculateDefaultDueDate,
} from "./purchase-bill-rules";
import {
  InvalidPurchaseBillLineError,
  PurchaseBillDomainError,
} from "../errors/purchase-bill-errors";

describe("purchase-bill totals calculation", () => {
  it("calculates exact totals for a single line with CGST/SGST split", () => {
    const totals = calculatePurchaseBillTotals({
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

  it("applies percentage bill discount against the post-line-discount base", () => {
    const totals = calculatePurchaseBillTotals({
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

  it("clamps fixed discounts so the taxable amount can never go negative", () => {
    const totals = calculatePurchaseBillTotals({
      items: [{ quantity: 1, unitPrice: 100, discount: 0, taxRate: 18 }],
      taxMode: "CGST_SGST",
      additionalDiscount: 999999,
      additionalDiscountType: "fixed",
    });

    expect(totals.effectiveAdditionalDiscount).toBe(100);
    expect(totals.taxableAmount).toBe(0);
    expect(totals.totalTax).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("routes the full tax amount to IGST in inter-state mode", () => {
    const totals = calculatePurchaseBillTotals({
      items: [{ quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
      taxMode: "IGST",
    });

    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
    expect(totals.igst).toBe(180);
    expect(totals.total).toBe(1180);
  });

  it("distributes totals across multiple tax slabs", () => {
    const totals = calculatePurchaseBillTotals({
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
});

describe("purchase-bill line validation", () => {
  it("accepts valid line items", () => {
    expect(() =>
      validatePurchaseBillLines([
        { item: "Steel Rods", quantity: 10, unitPrice: 500, discount: 5, taxRate: 18 },
      ]),
    ).not.toThrow();
  });

  it("rejects an empty line-item list", () => {
    expect(() => validatePurchaseBillLines([])).toThrow(
      InvalidPurchaseBillLineError,
    );
  });

  it("rejects blank item names, non-positive quantities, and negative prices", () => {
    expect(() =>
      validatePurchaseBillLines([{ item: "  ", quantity: 1, unitPrice: 10 }]),
    ).toThrow(InvalidPurchaseBillLineError);
    expect(() =>
      validatePurchaseBillLines([{ item: "Bolts", quantity: 0, unitPrice: 10 }]),
    ).toThrow(InvalidPurchaseBillLineError);
    expect(() =>
      validatePurchaseBillLines([{ item: "Bolts", quantity: 1, unitPrice: -5 }]),
    ).toThrow(InvalidPurchaseBillLineError);
  });

  it("rejects out-of-range discount and tax rates", () => {
    expect(() =>
      validatePurchaseBillLines([
        { item: "Bolts", quantity: 1, unitPrice: 10, discount: 101 },
      ]),
    ).toThrow(InvalidPurchaseBillLineError);
    expect(() =>
      validatePurchaseBillLines([
        { item: "Bolts", quantity: 1, unitPrice: 10, taxRate: -1 },
      ]),
    ).toThrow(InvalidPurchaseBillLineError);
  });
});

describe("purchase-bill date validation", () => {
  it("rejects a due date before the bill date", () => {
    expect(() =>
      validatePurchaseBillDates("2026-10-14", "2026-10-01"),
    ).toThrow(PurchaseBillDomainError);
  });

  it("accepts equal or later due dates", () => {
    expect(() =>
      validatePurchaseBillDates("2026-10-14", "2026-10-14"),
    ).not.toThrow();
    expect(() =>
      validatePurchaseBillDates("2026-10-14", "2026-11-13"),
    ).not.toThrow();
  });

  it("computes the default due date from the bill date", () => {
    expect(calculateDefaultDueDate("2026-10-01", 30)).toBe("2026-10-31");
  });
});
