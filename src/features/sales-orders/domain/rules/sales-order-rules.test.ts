import { describe, expect, it } from "vitest";
import {
  calculateSalesOrderTotals,
  validateSalesOrderLines,
  calculateExpectedDeliveryDate,
} from "./sales-order-rules";
import { InvalidSalesOrderLineError } from "../errors/sales-order-errors";

describe("sales-order domain rules and calculations", () => {
  it("computes basic line item totals, subtotal, and tax in intra-state mode (CGST/SGST)", () => {
    const totals = calculateSalesOrderTotals({
      items: [
        {
          quantity: 2,
          unitPrice: 500,
          discount: 10, // 2 * 500 = 1000 - 10% = 900
          taxRate: 18,
          fulfilledQuantity: 1,
        },
        {
          quantity: 1,
          unitPrice: 200,
          discount: 0, // 200
          taxRate: 12,
          fulfilledQuantity: 0,
        },
      ],
      taxMode: "CGST_SGST",
      additionalCharges: 50,
      additionalDiscount: 100,
      additionalDiscountType: "fixed",
    });

    expect(totals.subtotal).toBe(1200); // 1000 + 200
    expect(totals.lineDiscountTotal).toBe(100); // 100 + 0
    expect(totals.effectiveAdditionalDiscount).toBe(100);
    expect(totals.additionalCharges).toBe(50);
    // Base taxable = 1200 - 100 - 100 + 50 = 1050
    expect(totals.taxableAmount).toBe(1050);

    // Intra-state tax split
    expect(totals.cgst).toBeGreaterThan(0);
    expect(totals.sgst).toBeGreaterThan(0);
    expect(totals.igst).toBe(0);
    expect(totals.totalTax).toBe(totals.cgst + totals.sgst);
    expect(totals.total).toBe(totals.taxableAmount + totals.totalTax);

    // Fulfilment metrics
    expect(totals.totalOrderedQuantity).toBe(3);
    expect(totals.totalFulfilledQuantity).toBe(1);
    expect(totals.totalRemainingQuantity).toBe(2);
    expect(totals.fulfilmentPercentage).toBe(33.33);
  });

  it("computes tax in inter-state mode (IGST)", () => {
    const totals = calculateSalesOrderTotals({
      items: [
        {
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxRate: 18,
        },
      ],
      taxMode: "IGST",
      additionalCharges: 0,
      additionalDiscount: 0,
    });

    expect(totals.subtotal).toBe(1000);
    expect(totals.taxableAmount).toBe(1000);
    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
    expect(totals.igst).toBe(180);
    expect(totals.totalTax).toBe(180);
    expect(totals.total).toBe(1180);
    expect(totals.fulfilmentPercentage).toBe(0);
  });

  it("handles percentage additional discount correctly", () => {
    const totals = calculateSalesOrderTotals({
      items: [
        {
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          taxRate: 18,
        },
      ],
      taxMode: "IGST",
      additionalDiscount: 20,
      additionalDiscountType: "percentage",
    });

    expect(totals.subtotal).toBe(1000);
    expect(totals.effectiveAdditionalDiscount).toBe(200);
    expect(totals.taxableAmount).toBe(800);
    expect(totals.igst).toBe(144);
    expect(totals.total).toBe(944);
  });

  it("validates line items - rejects empty lines or invalid quantities", () => {
    expect(() => validateSalesOrderLines([])).toThrow(
      InvalidSalesOrderLineError,
    );

    expect(() =>
      validateSalesOrderLines([
        {
          item: "Valid Item",
          quantity: -1,
          unitPrice: 100,
        },
      ]),
    ).toThrow(InvalidSalesOrderLineError);

    expect(() =>
      validateSalesOrderLines([
        {
          item: "",
          quantity: 5,
          unitPrice: 100,
        },
      ]),
    ).toThrow(InvalidSalesOrderLineError);

    expect(() =>
      validateSalesOrderLines([
        {
          item: "Valid Item",
          quantity: 5,
          unitPrice: -50,
        },
      ]),
    ).toThrow(InvalidSalesOrderLineError);

    expect(() =>
      validateSalesOrderLines([
        {
          item: "Over Fulfilled Item",
          quantity: 5,
          unitPrice: 100,
          fulfilledQuantity: 6,
        },
      ]),
    ).toThrow(InvalidSalesOrderLineError);
  });

  it("calculates expected delivery date by adding given days to order date", () => {
    const expected = calculateExpectedDeliveryDate("2026-10-14", 15);
    expect(expected).toBe("2026-10-29");
  });
});
