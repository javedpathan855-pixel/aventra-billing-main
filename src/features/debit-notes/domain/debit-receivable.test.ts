import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  calculateRemainingReceivable,
  deriveInvoicePaymentStatus,
} from "@/features/invoices";

/**
 * Regression tests: debit notes adjust the receivable without ever acting
 * as cash. A debit raises the obligation; it can never mark an invoice PAID,
 * never changes amountPaid, and mixes honestly with credits.
 */
describe("invoice receivable with debit notes", () => {
  it("adds an issued debit to the remaining receivable and keeps Issued", () => {
    const breakdown = calculateRemainingReceivable({
      total: 11800,
      amountPaid: 0,
      creditedAmount: 0,
      debitedAmount: 1180,
    });
    expect(breakdown.remainingReceivable).toBe(12980);
    expect(breakdown.isCashFullyPaid).toBe(false);
    expect(
      deriveInvoicePaymentStatus({
        currentStatus: "Issued",
        total: 11800,
        amountPaid: 0,
        creditedAmount: 0,
        debitedAmount: 1180,
      }),
    ).toBe("Issued");
  });

  it("derives Partially Paid when a debit raises a paid invoice's balance", () => {
    expect(
      deriveInvoicePaymentStatus({
        currentStatus: "Paid",
        total: 11800,
        amountPaid: 11800,
        creditedAmount: 0,
        debitedAmount: 1180,
      }),
    ).toBe("Partially Paid");
  });

  it("derives Paid when cash covers the invoice plus the debit", () => {
    expect(
      deriveInvoicePaymentStatus({
        currentStatus: "Partially Paid",
        total: 11800,
        amountPaid: 12980,
        creditedAmount: 0,
        debitedAmount: 1180,
      }),
    ).toBe("Paid");
  });

  it("mixes credits and debits in one balance without cash", () => {
    // 11,800 − 1,180 credit + 2,360 debit = 12,980 outstanding, stays Issued.
    const breakdown = calculateRemainingReceivable({
      total: 11800,
      amountPaid: 0,
      creditedAmount: 1180,
      debitedAmount: 2360,
    });
    expect(breakdown.remainingReceivable).toBe(12980);
    expect(
      deriveInvoicePaymentStatus({
        currentStatus: "Issued",
        total: 11800,
        amountPaid: 0,
        creditedAmount: 1180,
        debitedAmount: 2360,
      }),
    ).toBe("Issued");
  });

  it("keeps totals balance consistent through calculateInvoiceTotals", () => {
    const totals = calculateInvoiceTotals({
      items: [{ id: "1", item: "Service", description: "", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
      amountPaid: 0,
      taxMode: "CGST_SGST",
      creditedAmount: 1180,
      debitedAmount: 2360,
    });
    expect(totals.total).toBe(11800);
    expect(totals.balance).toBe(12980);
    expect(totals.debitedAmount).toBe(2360);
  });

  it("preserves legacy behavior when no debits exist", () => {
    // Cash covering the net obligation after credits is still Paid.
    expect(
      deriveInvoicePaymentStatus({
        currentStatus: "Issued",
        total: 10000,
        amountPaid: 10000,
        creditedAmount: 2000,
      }),
    ).toBe("Paid");
    // Fully credited without cash still never reports Paid.
    expect(
      deriveInvoicePaymentStatus({
        currentStatus: "Issued",
        total: 10000,
        amountPaid: 0,
        creditedAmount: 10000,
      }),
    ).toBe("Issued");
  });
});
