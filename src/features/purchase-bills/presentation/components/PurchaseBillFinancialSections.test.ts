import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/purchase-bills",
  useSearchParams: () => new URLSearchParams(),
}));

import { PurchaseBillAdditionalChargesAndDiscountSection } from "./PurchaseBillAdditionalChargesAndDiscountSection";
import { PurchaseBillSummarySection } from "./PurchaseBillSummarySection";
import type { PurchaseBillTotals } from "../../domain/entities/purchase-bill";

const noop = () => {};

const totals: PurchaseBillTotals = {
  subtotal: 100000,
  lineDiscountTotal: 5000,
  effectiveAdditionalDiscount: 1000,
  additionalCharges: 1000,
  taxableAmount: 95000,
  cgst: 8550,
  sgst: 8550,
  igst: 0,
  totalTax: 17100,
  total: 112100,
  taxBreakdown: [
    { rate: 18, taxableAmount: 95000, taxAmount: 17100, cgst: 8550, sgst: 8550, igst: 0 },
  ],
};

describe("charges & discount section (invoice-aligned)", () => {
  const render = (overrides = {}) =>
    renderToStaticMarkup(
      createElement(PurchaseBillAdditionalChargesAndDiscountSection, {
        additionalCharges: 0,
        onAdditionalChargesChange: noop,
        additionalChargesLabel: "",
        onAdditionalChargesLabelChange: noop,
        additionalDiscount: 0,
        onAdditionalDiscountChange: noop,
        additionalDiscountType: "fixed",
        onAdditionalDiscountTypeChange: noop,
        additionalDiscountLabel: "",
        onAdditionalDiscountLabelChange: noop,
        ...overrides,
      }),
    );

  it("renders invoice-style panels, presets, and compact controls", () => {
    const html = render();

    expect(html).toContain("Additional Charges &amp; Discount");
    expect(html).toContain("Additional Charges");
    expect(html).toContain("Bill Discount");
    expect(html).toContain("Charge Description");
    expect(html).toContain("Discount Reason");
    expect(html).toContain("Presets:");
    expect(html).toContain("Freight");
    expect(html).toContain("Volume Discount");
    expect(html).toContain("Fixed (₹)");
    expect(html).toContain("Percent (%)");
  });

  it("shows empty inputs with zero placeholders instead of zeroes", () => {
    const html = render();

    expect(html).toContain('placeholder="0.00"');
  });

  it("caps percentage discounts at 100 like the invoice controls", () => {
    const html = render({ additionalDiscountType: "percentage" });

    expect(html).toContain("Rate (%)");
    expect(html).toContain('max="100"');
  });
});

describe("bill summary section (invoice-aligned)", () => {
  it("renders the invoice summary hierarchy with exact 2dp amounts", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseBillSummarySection, {
        totals,
        taxMode: "CGST_SGST",
        onTaxModeChange: noop,
      }),
    );

    expect(html).toContain("Bill Summary");
    expect(html).toContain("Subtotal");
    expect(html).toContain("Line Discounts");
    expect(html).toContain("Bill Discount");
    expect(html).toContain("Additional Charges");
    expect(html).toContain("Taxable Amount");
    expect(html).toContain("Tax Amount");
    expect(html).toContain("GST Summary");
    expect(html).toContain("Central GST (CGST)");
    expect(html).toContain("State GST (SGST)");
    expect(html).toContain("Rate Slabs");
    expect(html).toContain("GST @ 18%");
    expect(html).toContain("Bill Total");
    // Exact 2dp canonical formatting: 95000 taxable + 17100 tax = 112100 total
    expect(html).toContain("₹95,000.00");
    expect(html).toContain("₹17,100.00");
    expect(html).toContain("₹1,12,100.00");
    expect(html).toContain("CGST+SGST");
  });

  it("switches to the IGST presentation in inter-state mode", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseBillSummarySection, {
        totals: { ...totals, cgst: 0, sgst: 0, igst: 17100 },
        taxMode: "IGST",
        onTaxModeChange: noop,
      }),
    );

    expect(html).toContain("Integrated GST (IGST)");
    expect(html).not.toContain("Central GST (CGST)");
  });

  it("hides zero-value discount and charge rows like the invoice summary", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseBillSummarySection, {
        totals: {
          ...totals,
          lineDiscountTotal: 0,
          effectiveAdditionalDiscount: 0,
          additionalCharges: 0,
        },
        taxMode: "CGST_SGST",
        onTaxModeChange: noop,
      }),
    );

    expect(html).not.toContain("Line Discounts");
    expect(html).not.toContain("Bill Discount");
    expect(html).not.toContain("Additional Charges");
    expect(html).toContain("Taxable Amount");
    expect(html).toContain("Bill Total");
  });
});
