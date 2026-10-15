import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PaymentListPage } from "./page/PaymentListPage";
import { PaymentStatusBadge } from "./components/PaymentStatusBadge";
import { PaymentTable } from "./components/PaymentTable";
import { PaymentSummaryCards } from "./components/PaymentSummaryCards";
import { summarizePayments } from "../domain/rules/payment-filter";
import { formatCurrency } from "../domain/payment";
import type { Payment } from "../domain/payment";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: "pay-1",
  organizationId: "org-1",
  customerId: "cust-1",
  customerName: "Acme",
  amount: 10000,
  currency: "INR (₹)",
  paymentDate: "2026-10-16",
  method: "UPI",
  reference: "UPI-001",
  notes: "",
  status: "Active",
  allocations: [{ id: "pa-1", invoiceId: "inv-1", invoiceNumber: "INV-0001", amount: 10000 }],
  ...overrides,
});

describe("payments presentation", () => {
  it("renders status badges", () => {
    expect(
      renderToStaticMarkup(createElement(PaymentStatusBadge, { status: "Active" })),
    ).toContain("Active");
    expect(
      renderToStaticMarkup(createElement(PaymentStatusBadge, { status: "Reversed" })),
    ).toContain("Reversed");
  });

  it("renders the table with customer, amounts, and view actions", () => {
    const html = renderToStaticMarkup(
      createElement(PaymentTable, {
        payments: [
          payment(),
          { ...payment(), id: "pay-2", customerName: "Beta", status: "Reversed", amount: 5000 },
        ],
      }),
    );

    expect(html).toContain("Acme");
    expect(html).toContain("Beta");
    expect(html).toContain("UPI");
    expect(html).toContain("UPI-001");
    expect(html).toContain("/payments/pay-1");
    expect(html).toContain("Reversed");
  });

  it("renders summary cards with received and reversed splits", () => {
    const html = renderToStaticMarkup(
      createElement(PaymentSummaryCards, {
        summary: summarizePayments([
          payment(),
          { ...payment(), id: "pay-2", status: "Reversed", amount: 5000 },
        ]),
      }),
    );

    expect(html).toContain("Total Payments");
    expect(html).toContain("Total Received Value");
    expect(html).toContain(formatCurrency(10000));
  });

  it("renders list empty and populated states", () => {
    const empty = renderToStaticMarkup(
      createElement(PaymentListPage, { initialPayments: [] }),
    );
    expect(empty).toContain("No payments recorded yet");
    expect(empty).toContain("Record Payment");

    const populated = renderToStaticMarkup(
      createElement(PaymentListPage, { initialPayments: [payment()] }),
    );
    expect(populated).toContain("Payments Received");
    expect(populated).toContain("Acme");
  });
});
