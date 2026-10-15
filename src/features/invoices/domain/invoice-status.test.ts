import { describe, expect, it } from "vitest";
import {
  calculateRemainingReceivable,
  deriveInvoicePaymentStatus,
} from "./invoice";

/**
 * DEF-002 / DEF-004 / DEF-005 regression tests.
 * Cash received and issued Credit Note amounts are distinct concepts that
 * both reduce the remaining receivable — but only cash can mark an invoice
 * PAID. Every case asserts the remaining receivable AND the semantic status.
 */
describe("remaining receivable and payment status semantics", () => {
  it("₹10,000 invoice with no payments and no credits is fully outstanding and stays Issued", () => {
    const breakdown = calculateRemainingReceivable({ total: 10000, amountPaid: 0, creditedAmount: 0 });
    expect(breakdown.remainingReceivable).toBe(10000);
    expect(breakdown.isCashFullyPaid).toBe(false);
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Issued", total: 10000, amountPaid: 0, creditedAmount: 0 }),
    ).toBe("Issued");
  });

  it("₹10,000 invoice with ₹0 payments and ₹2,000 issued credit leaves ₹8,000 receivable and is not PARTIALLY_PAID", () => {
    const breakdown = calculateRemainingReceivable({ total: 10000, amountPaid: 0, creditedAmount: 2000 });
    expect(breakdown.remainingReceivable).toBe(8000);
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Issued", total: 10000, amountPaid: 0, creditedAmount: 2000 }),
    ).toBe("Issued");
  });

  it("₹10,000 invoice with ₹4,000 cash and ₹2,000 credit leaves ₹4,000 receivable and is PARTIALLY_PAID", () => {
    const breakdown = calculateRemainingReceivable({ total: 10000, amountPaid: 4000, creditedAmount: 2000 });
    expect(breakdown.remainingReceivable).toBe(4000);
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Issued", total: 10000, amountPaid: 4000, creditedAmount: 2000 }),
    ).toBe("Partially Paid");
  });

  it("₹10,000 invoice with ₹10,000 cash and no credits is PAID", () => {
    const breakdown = calculateRemainingReceivable({ total: 10000, amountPaid: 10000, creditedAmount: 0 });
    expect(breakdown.remainingReceivable).toBe(0);
    expect(breakdown.isCashFullyPaid).toBe(true);
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Issued", total: 10000, amountPaid: 10000, creditedAmount: 0 }),
    ).toBe("Paid");
  });

  it("₹10,000 invoice with ₹0 cash and a full ₹10,000 credit is settled but NOT marked PAID", () => {
    const breakdown = calculateRemainingReceivable({ total: 10000, amountPaid: 0, creditedAmount: 10000 });
    expect(breakdown.remainingReceivable).toBe(0);
    expect(breakdown.isCashFullyPaid).toBe(false);
    expect(breakdown.isFullySettled).toBe(true);
    // A credit is not cash: the invoice keeps its working status until the
    // business adopts a dedicated SETTLED/CREDITED state.
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Issued", total: 10000, amountPaid: 0, creditedAmount: 10000 }),
    ).toBe("Issued");
  });

  it("preserves Draft and Cancelled regardless of money", () => {
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Draft", total: 10000, amountPaid: 10000, creditedAmount: 0 }),
    ).toBe("Draft");
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Cancelled", total: 10000, amountPaid: 0, creditedAmount: 10000 }),
    ).toBe("Cancelled");
  });

  it("clamps negative inputs and never reports a negative receivable", () => {
    const breakdown = calculateRemainingReceivable({ total: 10000, amountPaid: -50, creditedAmount: -20 });
    expect(breakdown.remainingReceivable).toBe(10000);
  });

  it("keeps multiple partial payments and credits consistent", () => {
    // ₹11,800 total, ₹5,000 cash, ₹3,000 + ₹1,000 credits → ₹2,800 left.
    const breakdown = calculateRemainingReceivable({ total: 11800, amountPaid: 5000, creditedAmount: 4000 });
    expect(breakdown.remainingReceivable).toBe(2800);
    expect(
      deriveInvoicePaymentStatus({ currentStatus: "Overdue", total: 11800, amountPaid: 5000, creditedAmount: 4000 }),
    ).toBe("Partially Paid");
  });
});
