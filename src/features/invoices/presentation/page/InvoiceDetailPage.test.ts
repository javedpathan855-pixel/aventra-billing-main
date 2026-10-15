import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { InvoiceDetailPage } from "./InvoiceDetailPage";
import type { Invoice } from "../../domain/invoice";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "inv-1" }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../hooks/InvoiceWorkspaceProvider", () => ({
  useInvoiceWorkspace: () => ({ getInvoice: () => undefined }),
}));

vi.mock("../../data/mutations/invoice-mutations", () => ({
  issueInvoiceAction: vi.fn(),
  cancelInvoiceAction: vi.fn(),
  deleteInvoiceAction: vi.fn(),
}));

const baseInvoice: Invoice = {
  id: "inv-1",
  number: "INV-0001",
  customer: "Acme",
  customerEmail: "billing@acme.com",
  customerAddress: "Mumbai",
  customerGstin: "",
  issueDate: "2026-10-01",
  dueDate: "2026-10-30",
  status: "Issued",
  taxMode: "CGST_SGST",
  notes: "",
  paymentTerms: "Net 15 days",
  terms: "",
  items: [
    {
      id: "line-1",
      item: "Service",
      description: "",
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      taxRate: 18,
    },
  ],
  amountPaid: 0,
};

/**
 * Phase 1 UI rules: every status shows its badge and only its valid actions;
 * blocked actions are explained, never silently missing or fake.
 */
describe("InvoiceDetailPage status actions", () => {
  it("shows the derived Overdue badge for a past-due unpaid invoice", () => {
    const html = renderToStaticMarkup(
      createElement(InvoiceDetailPage, {
        initialInvoice: { ...baseInvoice, status: "Issued", dueDate: "2020-01-01" },
      }),
    );

    expect(html).toContain("Overdue");
  });

  it("offers Edit, Issue, and Delete for drafts", () => {
    const html = renderToStaticMarkup(
      createElement(InvoiceDetailPage, {
        initialInvoice: { ...baseInvoice, status: "Draft" },
      }),
    );

    expect(html).toContain("Edit Draft");
    expect(html).toContain("Issue Invoice");
    expect(html).toContain("Delete");
    expect(html).not.toContain("Cancel Invoice");
  });

  it("offers Cancel for clean issued invoices", () => {
    const html = renderToStaticMarkup(
      createElement(InvoiceDetailPage, {
        initialInvoice: { ...baseInvoice, status: "Issued", dueDate: "2099-01-01" },
      }),
    );

    expect(html).toContain("Cancel Invoice");
    expect(html).not.toContain("Issue Invoice");
    expect(html).not.toContain("Edit Draft");
  });

  it("explains blocked cancellation instead of faking it", () => {
    const html = renderToStaticMarkup(
      createElement(InvoiceDetailPage, {
        initialInvoice: { ...baseInvoice, status: "Partially Paid", amountPaid: 1000 },
      }),
    );

    expect(html).toContain("Cancel Unavailable");
    expect(html).not.toContain("Cancel Invoice</span>");
  });

  it("shows no mutating actions for paid or cancelled invoices", () => {
    const paid = renderToStaticMarkup(
      createElement(InvoiceDetailPage, {
        initialInvoice: { ...baseInvoice, status: "Paid", amountPaid: 11800 },
      }),
    );
    expect(paid).toContain("Paid");
    expect(paid).not.toContain("Issue Invoice");
    expect(paid).not.toContain("Cancel Invoice");
    expect(paid).not.toContain("Delete");

    const cancelled = renderToStaticMarkup(
      createElement(InvoiceDetailPage, {
        initialInvoice: { ...baseInvoice, status: "Cancelled" },
      }),
    );
    expect(cancelled).toContain("Cancelled");
    expect(cancelled).not.toContain("Issue Invoice");
    expect(cancelled).not.toContain("Edit Draft");
  });
});
