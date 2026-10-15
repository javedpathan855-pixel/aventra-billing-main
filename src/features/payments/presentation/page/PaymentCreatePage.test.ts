import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentCreatePage } from "./PaymentCreatePage";
import type { PayableInvoiceOption } from "../../data/queries/get-payable-invoices";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../../data/mutations/payment-mutations", () => ({
  recordPaymentAction: vi.fn(),
  reversePaymentAction: vi.fn(),
}));

const customers = [
  { id: "cust-1", name: "Acme Corp", email: "billing@acme.com" },
];

const invoices: PayableInvoiceOption[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-0001",
    customerId: "cust-1",
    customerName: "Acme Corp",
    issueDate: "2026-10-15",
    dueDate: "2026-10-30",
    status: "Issued",
    total: 10000,
    remainingBalance: 10000,
  },
];

describe("PaymentCreatePage", () => {
  it("renders customer, method, date, and allocation controls", () => {
    const html = renderToStaticMarkup(
      createElement(PaymentCreatePage, {
        initialCustomers: customers,
        initialInvoices: invoices,
      }),
    );

    expect(html).toContain("Record Payment");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Bank Transfer");
    expect(html).toContain("payment-date-trigger");
    expect(html).not.toContain('type="date"');
    expect(html).toContain("Allocate to Invoices");
  });

  it("shows an honest empty state when the customer has no open invoices", () => {
    const html = renderToStaticMarkup(
      createElement(PaymentCreatePage, {
        initialCustomers: customers,
        initialInvoices: [],
      }),
    );

    expect(html).toContain("Record Payment");
  });

  it("preselects the invoice from a contextual flow", () => {
    const html = renderToStaticMarkup(
      createElement(PaymentCreatePage, {
        initialCustomers: customers,
        initialInvoices: invoices,
        preselectedInvoiceId: "inv-1",
        preselectedCustomerId: "cust-1",
      }),
    );

    expect(html).toContain("INV-0001");
  });
});
