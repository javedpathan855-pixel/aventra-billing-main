import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals } from "./invoice";

const line = (overrides: Partial<{ quantity: number; unitPrice: number; discount: number; taxRate: number }> = {}) => ({
  id: "l-1",
  item: "Service",
  description: "",
  quantity: 1,
  unitPrice: 10000,
  discount: 0,
  taxRate: 18,
  ...overrides,
});

/**
 * DEF-008 regression tests: header discounts (fixed and percentage) reduce
 * GST proportionally instead of leaving tax computed on the pre-discount
 * base. Charges are added post-tax. All totals use decimal-safe rounding.
 */
describe("header discount and GST calculation", () => {
  it("reduces tax proportionally for a percentage discount", () => {
    const totals = calculateInvoiceTotals({
      items: [line()],
      amountPaid: 0,
      taxMode: "CGST_SGST",
      additionalDiscount: 10,
      additionalDiscountType: "percentage",
    });
    // Base taxable 10,000 → discount 1,000 → taxable 9,000 → tax 1,620.
    expect(totals.taxable).toBe(9000);
    expect(totals.tax).toBe(1620);
    expect(totals.cgst).toBe(810);
    expect(totals.sgst).toBe(810);
    expect(totals.total).toBe(10620);
  });

  it("reduces tax proportionally for a fixed discount", () => {
    const totals = calculateInvoiceTotals({
      items: [line()],
      amountPaid: 0,
      taxMode: "IGST",
      additionalDiscount: 2000,
      additionalDiscountType: "fixed",
    });
    // Taxable 10,000 − 2,000 = 8,000 → IGST 1,440 → total 9,440.
    expect(totals.taxable).toBe(8000);
    expect(totals.tax).toBe(1440);
    expect(totals.igst).toBe(1440);
    expect(totals.total).toBe(9440);
  });

  it("caps a fixed discount at the taxable base instead of going negative", () => {
    const totals = calculateInvoiceTotals({
      items: [line()],
      amountPaid: 0,
      taxMode: "CGST_SGST",
      additionalDiscount: 50000,
      additionalDiscountType: "fixed",
    });
    expect(totals.taxable).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("prorates tax across mixed tax rates for a fixed discount", () => {
    const totals = calculateInvoiceTotals({
      items: [line({ unitPrice: 10000, taxRate: 18 }), line({ unitPrice: 10000, taxRate: 12 })],
      amountPaid: 0,
      taxMode: "IGST",
      additionalDiscount: 10000,
      additionalDiscountType: "fixed",
    });
    // Each ₹10,000 line carries half the ₹10,000 discount → ₹5,000 taxable
    // each → tax 900 + 600 = 1,500; total 10,000 + 1,500 = 11,500.
    expect(totals.taxable).toBe(10000);
    expect(totals.tax).toBe(1500);
    expect(totals.total).toBe(11500);
  });

  it("adds charges post-tax without changing GST", () => {
    const totals = calculateInvoiceTotals({
      items: [line()],
      amountPaid: 0,
      taxMode: "CGST_SGST",
      additionalCharges: 500,
      additionalDiscount: 10,
      additionalDiscountType: "percentage",
    });
    expect(totals.tax).toBe(1620);
    expect(totals.total).toBe(9000 + 1620 + 500);
  });

  it("keeps CGST/SGST halves summing exactly to the tax", () => {
    const totals = calculateInvoiceTotals({
      items: [line({ unitPrice: 999.99, taxRate: 18 })],
      amountPaid: 0,
      taxMode: "CGST_SGST",
      additionalDiscount: 7,
      additionalDiscountType: "percentage",
    });
    expect(totals.cgst + totals.sgst).toBe(totals.tax);
  });
});
