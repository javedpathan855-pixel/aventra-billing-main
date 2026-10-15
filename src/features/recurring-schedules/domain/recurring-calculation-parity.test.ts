import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals } from "@/features/invoices";

/**
 * Regression tests: the recurring form preview and every generated invoice
 * total must agree with the authoritative invoice calculation engine for
 * identical inputs — including header extras, both discount modes, charges,
 * and both GST modes. The preview path calls calculateInvoiceTotals
 * directly; these cases pin the exact values it must produce.
 */
describe("recurring preview / invoice calculation parity", () => {
  const items = [
    {
      id: "l-1",
      item: "Retainer",
      description: "",
      quantity: 2,
      unitPrice: 50000,
      discount: 10,
      taxRate: 18,
    },
  ];

  it("matches Create Invoice math without extras", () => {
    const totals = calculateInvoiceTotals({ items, amountPaid: 0, taxMode: "CGST_SGST" });
    // 2 × 50,000 = 100,000 − 10% = 90,000 taxable; 18% = 16,200; total 106,200.
    expect(totals.subtotal).toBe(100000);
    expect(totals.taxable).toBe(90000);
    expect(totals.tax).toBe(16200);
    expect(totals.cgst).toBe(8100);
    expect(totals.sgst).toBe(8100);
    expect(totals.total).toBe(106200);
    expect(totals.balance).toBe(106200);
  });

  it("matches with percentage header discount and charges", () => {
    const totals = calculateInvoiceTotals({
      items,
      amountPaid: 0,
      taxMode: "CGST_SGST",
      additionalDiscount: 10,
      additionalDiscountType: "percentage",
      additionalCharges: 500,
    });
    // Base taxable 90,000 − 10% (9,000) = 81,000; prorated tax 14,580; +500.
    expect(totals.taxable).toBe(81000);
    expect(totals.tax).toBe(14580);
    expect(totals.total).toBe(81000 + 14580 + 500);
  });

  it("matches with fixed header discount under IGST", () => {
    const totals = calculateInvoiceTotals({
      items,
      amountPaid: 0,
      taxMode: "IGST",
      additionalDiscount: 20000,
      additionalDiscountType: "fixed",
    });
    // 90,000 − 20,000 = 70,000; IGST 12,600; total 82,600.
    expect(totals.taxable).toBe(70000);
    expect(totals.igst).toBe(12600);
    expect(totals.cgst).toBe(0);
    expect(totals.total).toBe(82600);
  });

  it("caps fixed discounts and never reports negative balances", () => {
    const totals = calculateInvoiceTotals({
      items,
      amountPaid: 0,
      taxMode: "CGST_SGST",
      additionalDiscount: 500000,
      additionalDiscountType: "fixed",
    });
    expect(totals.taxable).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
    expect(totals.balance).toBe(0);
  });
});
