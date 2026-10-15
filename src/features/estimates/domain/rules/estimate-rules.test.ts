import { describe, expect, it } from "vitest";
import {
  calculateEstimateTotals,
  calculateValidUntilDate,
  formatCurrency,
  formatEstimateDate,
  lineTax,
  lineTaxable,
  resolveEstimateDisplayStatus,
  roundCurrency,
  validateEstimate,
} from "./estimate-rules";
import type { EstimateLineItem } from "../entities/estimate";

describe("estimate calculations & domain rules", () => {
  it("calculates line taxable amount and tax accurately", () => {
    const item: EstimateLineItem = {
      id: "line-1",
      item: "Web development sprint",
      description: "Frontend implementation",
      quantity: 2,
      unitPrice: 50000,
      discount: 10, // 10% discount -> 90,000 taxable
      taxRate: 18, // 18% GST -> 16,200 tax
    };

    expect(lineTaxable(item)).toBe(90000);
    expect(lineTax(item)).toBe(16200);
  });

  it("calculates document totals with intra-state CGST/SGST split", () => {
    const items: EstimateLineItem[] = [
      {
        id: "l1",
        item: "UI Design",
        description: "Figma design system",
        quantity: 1,
        unitPrice: 40000,
        discount: 0,
        taxRate: 18,
      },
      {
        id: "l2",
        item: "Backend API",
        description: "Node.js REST service",
        quantity: 2,
        unitPrice: 30000,
        discount: 5, // 57,000 taxable
        taxRate: 18,
      },
    ];

    const totals = calculateEstimateTotals({
      items,
      taxMode: "CGST_SGST",
      additionalDiscount: 5000,
      additionalDiscountType: "fixed",
      additionalCharges: 1000,
    });

    // Subtotal = 40,000 + 60,000 = 100,000
    expect(totals.subtotal).toBe(100000);
    // Line discount = 3,000. Header discount = 5,000. Total discount = 8,000
    expect(totals.discount).toBe(8000);
    // Base taxable = 40,000 + 57,000 = 97,000. Net taxable = 97,000 - 5,000 = 92,000
    expect(totals.taxable).toBe(92000);
    // GST = 18% on 92,000 = 16,560
    expect(totals.tax).toBe(16560);
    expect(totals.cgst).toBe(8280);
    expect(totals.sgst).toBe(8280);
    expect(totals.igst).toBe(0);
    // Total = 92,000 + 16,560 + 1,000 = 109,560
    expect(totals.total).toBe(109560);
    expect(totals.additionalCharges).toBe(1000);
    expect(totals.additionalDiscount).toBe(5000);
  });

  it("calculates document totals with inter-state IGST", () => {
    const items: EstimateLineItem[] = [
      {
        id: "l1",
        item: "Cloud Architecture",
        description: "AWS multi-region",
        quantity: 1,
        unitPrice: 100000,
        discount: 10, // 90,000 taxable
        taxRate: 18,
      },
    ];

    const totals = calculateEstimateTotals({
      items,
      taxMode: "IGST",
      additionalDiscount: 10,
      additionalDiscountType: "percentage", // 10% of 90,000 = 9,000
    });

    expect(totals.subtotal).toBe(100000);
    expect(totals.discount).toBe(19000); // 10,000 + 9,000
    expect(totals.taxable).toBe(81000);
    expect(totals.tax).toBe(14580);
    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
    expect(totals.igst).toBe(14580);
    expect(totals.total).toBe(95580);
  });

  it("handles decimal precision and rounding safely without floating point drift", () => {
    const items: EstimateLineItem[] = [
      {
        id: "l1",
        item: "Custom Widget",
        description: "Precision parts",
        quantity: 3,
        unitPrice: 33.33,
        discount: 5.5,
        taxRate: 18,
      },
    ];

    const totals = calculateEstimateTotals({ items });
    expect(roundCurrency(totals.total)).toBe(totals.total);
    expect(String(totals.total).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it("validates estimates and flags required fields", () => {
    const invalidErrors = validateEstimate({
      customer: "",
      issueDate: "",
      validUntil: "",
      items: [],
    });

    expect(invalidErrors.customer).toBeDefined();
    expect(invalidErrors.issueDate).toBeDefined();
    expect(invalidErrors.validUntil).toBeDefined();
    expect(invalidErrors.items).toBeDefined();
  });

  it("flags expiration date earlier than quotation date", () => {
    const errors = validateEstimate({
      customer: "Acme Corp",
      issueDate: "2026-10-20",
      validUntil: "2026-10-10",
      items: [
        {
          id: "1",
          item: "Service",
          description: "",
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(errors.validUntil).toBe(
      "Expiration date must be on or after quotation date.",
    );
  });

  it("flags invalid line item parameters", () => {
    const errors = validateEstimate({
      customer: "Acme Corp",
      issueDate: "2026-10-10",
      validUntil: "2026-11-10",
      items: [
        {
          id: "1",
          item: "",
          description: "",
          quantity: 0,
          unitPrice: -50,
          discount: 150,
          taxRate: -5,
        },
      ],
    });

    expect(errors["item-0"]).toBeDefined();
    expect(errors["quantity-0"]).toBeDefined();
    expect(errors["price-0"]).toBeDefined();
    expect(errors["discount-0"]).toBeDefined();
    expect(errors["tax-0"]).toBeDefined();
  });

  it("calculates validity expiration date correctly", () => {
    expect(calculateValidUntilDate("2026-10-01", 30)).toBe("2026-10-31");
    expect(calculateValidUntilDate("2026-02-01", 15)).toBe("2026-02-16");
  });

  it("resolves display status including expiration logic", () => {
    // If Draft or Sent and past validUntil -> Expired
    expect(
      resolveEstimateDisplayStatus({
        status: "Draft",
        validUntil: "2026-09-30",
        today: "2026-10-14",
      }),
    ).toBe("Expired");

    expect(
      resolveEstimateDisplayStatus({
        status: "Sent",
        validUntil: "2026-09-30",
        today: "2026-10-14",
      }),
    ).toBe("Expired");

    // If future validUntil -> keeps current status
    expect(
      resolveEstimateDisplayStatus({
        status: "Sent",
        validUntil: "2026-11-30",
        today: "2026-10-14",
      }),
    ).toBe("Sent");

    // Accepted, Converted, Rejected, Cancelled do not expire
    expect(
      resolveEstimateDisplayStatus({
        status: "Accepted",
        validUntil: "2026-09-30",
        today: "2026-10-14",
      }),
    ).toBe("Accepted");

    expect(
      resolveEstimateDisplayStatus({
        status: "Converted",
        validUntil: "2026-09-30",
        today: "2026-10-14",
      }),
    ).toBe("Converted");

    expect(
      resolveEstimateDisplayStatus({
        status: "Rejected",
        validUntil: "2026-09-30",
        today: "2026-10-14",
      }),
    ).toBe("Rejected");

    expect(
      resolveEstimateDisplayStatus({
        status: "Cancelled",
        validUntil: "2026-09-30",
        today: "2026-10-14",
      }),
    ).toBe("Cancelled");
  });

  it("formats dates and currencies cleanly", () => {
    expect(formatEstimateDate("2026-10-14")).toContain("Oct");
    expect(formatEstimateDate("2026-10-14")).toContain("2026");
    expect(formatCurrency(15000)).toContain("15,000");
  });
});
