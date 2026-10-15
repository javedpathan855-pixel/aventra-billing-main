import { describe, expect, it } from "vitest";
import {
  calculateDebitNoteTotals,
  canEditDebitNote,
  canIssueDebitNote,
  formatDebitNoteCurrency,
  formatDebitNoteDate,
  lineDiscount,
  lineSubtotal,
  lineTax,
  lineTaxable,
  validateDebitNote,
  validateDebitNoteLineItems,
} from "./debit-note";

const line = (overrides: Partial<{ quantity: number; unitPrice: number; discount: number; taxRate: number }> = {}) => ({
  id: "l-1",
  item: "Additional service",
  description: "",
  quantity: 1,
  unitPrice: 10000,
  discount: 0,
  taxRate: 18,
  ...overrides,
});

describe("debit note line calculations", () => {
  it("computes subtotal, discount, taxable, and tax per line", () => {
    const l = line({ quantity: 2, unitPrice: 1000, discount: 10, taxRate: 18 });
    expect(lineSubtotal(l)).toBe(2000);
    expect(lineDiscount(l)).toBe(200);
    expect(lineTaxable(l)).toBe(1800);
    expect(lineTax(l)).toBe(324);
  });

  it("calculates CGST/SGST totals for intra-state notes", () => {
    const totals = calculateDebitNoteTotals({ items: [line()], taxMode: "CGST_SGST" });
    expect(totals).toEqual({
      subtotal: 10000,
      discount: 0,
      taxable: 10000,
      tax: 1800,
      cgst: 900,
      sgst: 900,
      igst: 0,
      total: 11800,
    });
  });

  it("calculates IGST totals for inter-state notes", () => {
    const totals = calculateDebitNoteTotals({ items: [line()], taxMode: "IGST" });
    expect(totals.cgst).toBe(0);
    expect(totals.sgst).toBe(0);
    expect(totals.igst).toBe(1800);
    expect(totals.total).toBe(11800);
  });

  it("keeps CGST/SGST halves summing exactly to the tax", () => {
    const totals = calculateDebitNoteTotals({
      items: [line({ unitPrice: 999.99 })],
      taxMode: "CGST_SGST",
    });
    expect(totals.cgst + totals.sgst).toBe(totals.tax);
  });

  it("never produces negative totals from rounding edges", () => {
    const totals = calculateDebitNoteTotals({
      items: [line({ quantity: 0.001, unitPrice: 0.01, discount: 100, taxRate: 0 })],
      taxMode: "CGST_SGST",
    });
    expect(totals.total).toBeGreaterThanOrEqual(0);
  });
});

describe("debit note lifecycle guards", () => {
  it("allows editing and issuing only from Draft", () => {
    expect(canEditDebitNote("Draft")).toBe(true);
    expect(canEditDebitNote("Issued")).toBe(false);
    expect(canEditDebitNote("Cancelled")).toBe(false);
    expect(canIssueDebitNote("Draft")).toBe(true);
    expect(canIssueDebitNote("Issued")).toBe(false);
    expect(canIssueDebitNote("Cancelled")).toBe(false);
  });
});

describe("debit note validation", () => {
  it("requires an invoice reference, date, reason, and items", () => {
    const errors = validateDebitNote({ invoiceId: "", issueDate: "", reason: "", items: [] });
    expect(errors.invoiceId).toBeTruthy();
    expect(errors.issueDate).toBeTruthy();
    expect(errors.reason).toBeTruthy();
    expect(errors.items).toBeTruthy();
  });

  it("accepts a complete draft", () => {
    const errors = validateDebitNote({
      invoiceId: "inv-1",
      issueDate: "2026-10-15",
      reason: "Under-billing correction",
      items: [line()],
    });
    expect(errors).toEqual({});
  });

  it("rejects invalid line items", () => {
    expect(validateDebitNoteLineItems([]).items).toBeTruthy();
    const errors = validateDebitNoteLineItems([
      { ...line(), item: "", quantity: 0, unitPrice: -5, discount: 101, taxRate: 101 },
    ]);
    expect(errors["item-0"]).toBeTruthy();
    expect(errors["quantity-0"]).toBeTruthy();
    expect(errors["price-0"]).toBeTruthy();
    expect(errors["discount-0"]).toBeTruthy();
    expect(errors["tax-0"]).toBeTruthy();
  });
});

describe("debit note formatting", () => {
  it("formats INR currency and dates", () => {
    expect(formatDebitNoteCurrency(11800)).toContain("11,800");
    expect(formatDebitNoteDate("2026-10-15")).toContain("2026");
    expect(formatDebitNoteDate("not-a-date")).toBe("Not supplied");
  });
});
