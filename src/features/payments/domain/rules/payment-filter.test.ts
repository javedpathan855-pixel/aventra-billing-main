import { describe, expect, it } from "vitest";
import { filterPayments, summarizePayments } from "./payment-filter";
import type { Payment } from "../payment";

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: "pay-1",
  organizationId: "org-1",
  customerName: "Acme",
  amount: 10000,
  currency: "INR (₹)",
  paymentDate: "2026-10-15",
  method: "Bank Transfer",
  notes: "",
  status: "Active",
  allocations: [{ id: "pa-1", invoiceId: "inv-1", amount: 10000 }],
  ...overrides,
});

describe("filterPayments", () => {
  const payments = [
    payment({ id: "a", method: "UPI", reference: "UPI-001" }),
    payment({ id: "b", customerName: "Beta", status: "Reversed", method: "Cash", amount: 5000 }),
  ];

  it("searches customer, reference, and notes", () => {
    expect(filterPayments(payments, { query: "beta" }).map((p) => p.id)).toEqual(["b"]);
    expect(filterPayments(payments, { query: "upi-001" }).map((p) => p.id)).toEqual(["a"]);
  });

  it("filters by status, method, and sorts", () => {
    expect(filterPayments(payments, { status: "Reversed" }).map((p) => p.id)).toEqual(["b"]);
    expect(filterPayments(payments, { method: "Cash" }).map((p) => p.id)).toEqual(["b"]);
    expect(filterPayments(payments, { sortBy: "amount-asc" }).map((p) => p.id)).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("summarizePayments", () => {
  it("counts active cash separately from reversed records", () => {
    const summary = summarizePayments([
      payment({ amount: 10000 }),
      payment({ id: "b", status: "Reversed", amount: 5000 }),
    ]);
    expect(summary.totalPayments).toBe(2);
    expect(summary.totalReceived).toBe(10000);
    expect(summary.activeCount).toBe(1);
    expect(summary.reversedCount).toBe(1);
  });
});
