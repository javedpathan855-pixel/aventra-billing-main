import { describe, expect, it } from "vitest";
import {
  canCancelInvoice,
  getTodayDateString,
  resolveInvoiceDisplayStatus,
} from "./invoice";

/**
 * Phase 1 status lifecycle tests: workflow states, payment derivation,
 * time-derived Overdue, and cancellation guards. No level may be forged —
 * these pin the matrix the UI and mutations must obey.
 */
describe("invoice status transition matrix", () => {
  it("derives Paid only when cash covers the obligation", () => {
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 10000,
        dueDate: "2026-01-01",
        today: "2026-12-31",
      }),
    ).toBe("Paid");
  });

  it("never reports credit-only settlements as Paid", () => {
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 0,
        creditedAmount: 10000,
        dueDate: "2020-01-01",
        today: "2026-12-31",
      }),
    ).toBe("Issued");
  });

  it("reports Partially Paid when cash was received and a balance remains", () => {
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 4000,
        dueDate: "2026-12-31",
        today: "2026-01-01",
      }),
    ).toBe("Partially Paid");
  });
});

describe("time-derived Overdue", () => {
  it("shows Overdue for unpaid working invoices past their due date", () => {
    for (const status of ["Issued", "Partially Paid", "Overdue"] as const) {
      expect(
        resolveInvoiceDisplayStatus({
          status,
          total: 10000,
          amountPaid: status === "Partially Paid" ? 1000 : 0,
          dueDate: "2026-10-01",
          today: "2026-10-15",
        }),
      ).toBe("Overdue");
    }
  });

  it("does not mark invoices overdue on or before the due date", () => {
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 0,
        dueDate: "2026-10-15",
        today: "2026-10-15",
      }),
    ).toBe("Issued");
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 0,
        dueDate: "2026-12-31",
        today: "2026-01-01",
      }),
    ).toBe("Issued");
  });

  it("never shows Overdue for settled, draft, or cancelled invoices", () => {
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 10000,
        dueDate: "2020-01-01",
        today: "2026-12-31",
      }),
    ).toBe("Paid");
    expect(
      resolveInvoiceDisplayStatus({
        status: "Draft",
        total: 10000,
        amountPaid: 0,
        dueDate: "2020-01-01",
        today: "2026-12-31",
      }),
    ).toBe("Draft");
    expect(
      resolveInvoiceDisplayStatus({
        status: "Cancelled",
        total: 10000,
        amountPaid: 0,
        dueDate: "2020-01-01",
        today: "2026-12-31",
      }),
    ).toBe("Cancelled");
  });

  it("ignores malformed dates instead of misreporting", () => {
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 0,
        dueDate: "",
        today: "2026-12-31",
      }),
    ).toBe("Issued");
    expect(
      resolveInvoiceDisplayStatus({
        status: "Issued",
        total: 10000,
        amountPaid: 0,
        dueDate: "not-a-date",
        today: "2026-12-31",
      }),
    ).toBe("Issued");
  });

  it("defaults today to the existing date convention", () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const displayed = resolveInvoiceDisplayStatus({
      status: "Issued",
      total: 10000,
      amountPaid: 0,
      dueDate: "2000-01-01",
    });
    expect(displayed).toBe("Overdue");
  });
});

describe("cancellation guard", () => {
  it("allows cancelling clean issued or overdue invoices", () => {
    expect(
      canCancelInvoice({ status: "Issued", amountPaid: 0 }),
    ).toBe(true);
    expect(
      canCancelInvoice({ status: "Overdue", amountPaid: 0 }),
    ).toBe(true);
  });

  it("blocks cancellation with any recorded money movement", () => {
    expect(
      canCancelInvoice({ status: "Issued", amountPaid: 100 }),
    ).toBe(false);
    expect(
      canCancelInvoice({ status: "Issued", amountPaid: 0, creditedAmount: 500 }),
    ).toBe(false);
    expect(
      canCancelInvoice({ status: "Overdue", amountPaid: 0, debitedAmount: 250 }),
    ).toBe(false);
  });

  it("blocks cancellation from terminal or draft states", () => {
    for (const status of ["Draft", "Paid", "Partially Paid", "Cancelled"] as const) {
      expect(canCancelInvoice({ status, amountPaid: 0 })).toBe(false);
    }
  });
});
