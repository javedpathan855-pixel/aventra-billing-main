import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DebitNoteCreatePage } from "./DebitNoteCreatePage";
import type { EligibleInvoiceForDebitDto } from "../../data/dto/debit-note-dto";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../data/mutations/debit-note-mutations", () => ({
  createDebitNoteAction: vi.fn(),
  updateDebitNoteAction: vi.fn(),
}));

const mockEligibleInvoices: EligibleInvoiceForDebitDto[] = [
  {
    id: "inv-alpha",
    invoiceNumber: "INV-2026-0001",
    customerName: "Acme Corp",
    customerEmail: "billing@acme.com",
    customerAddress: "Mumbai, Maharashtra",
    customerGstin: "27AABCB1234F1Z1",
    customerPlaceOfSupply: "27-Maharashtra",
    issueDate: "2026-10-10",
    dueDate: "2026-10-25",
    total: 100000,
    debitedTotal: 0,
    remainingDebitableAmount: 100000,
    status: "Issued",
    taxMode: "CGST_SGST",
    items: [
      {
        id: "inv-item-1",
        productId: "prod-1",
        item: "Software Engineering Retainer",
        description: "Monthly subscription",
        hsnSac: "998314",
        quantity: 1,
        unitPrice: 84745.76,
        discount: 0,
        taxRate: 18,
        lineTotal: 84745.76,
      },
    ],
  },
];

describe("DebitNoteCreatePage shared controls", () => {
  it("renders the invoice picker, shared date picker, and action buttons", () => {
    const html = renderToStaticMarkup(
      createElement(DebitNoteCreatePage, {
        eligibleInvoices: mockEligibleInvoices,
        previewDebitNoteNumber: "DN-0007",
      }),
    );

    expect(html).toContain("Create Debit Note");
    expect(html).toContain("INV-2026-0001");
    expect(html).toContain("Acme Corp");
    // Shared DatePicker trigger (not a native date input).
    expect(html).toContain("debit-note-date-trigger");
    expect(html).not.toContain('type="date"');
    // Shared action buttons.
    expect(html).toContain("Save as Draft");
    expect(html).toContain("Preview");
    expect(html).toContain("Issue Debit Note");
    // Reason select and seeded line items from the preselected invoice.
    expect(html).toContain("Under-billing correction");
  });

  it("shows an honest empty state when no invoice is eligible", () => {
    const html = renderToStaticMarkup(
      createElement(DebitNoteCreatePage, { eligibleInvoices: [] }),
    );

    expect(html).toContain("No eligible invoices found");
    expect(html).toContain("View Invoices");
    expect(html).not.toContain("Issue Debit Note");
  });

  it("renders edit mode with the saved number for an existing draft", () => {
    const html = renderToStaticMarkup(
      createElement(DebitNoteCreatePage, {
        eligibleInvoices: mockEligibleInvoices,
        existingDebitNote: {
          id: "dn-draft-1",
          debitNoteNumber: "DN-0003",
          invoiceId: "inv-alpha",
          invoiceNumber: "INV-2026-0001",
          customerName: "Acme Corp",
          customerEmail: "",
          customerAddress: "",
          customerGstin: "",
          issueDate: "2026-10-15",
          status: "Draft",
          reason: "Price revision",
          taxMode: "CGST_SGST",
          currency: "INR (₹)",
          subtotal: 1000,
          lineDiscountTotal: 0,
          taxableAmount: 1000,
          cgst: 90,
          sgst: 90,
          igst: 0,
          totalTax: 180,
          total: 1180,
          notes: "",
          terms: "",
          items: [
            {
              id: "dn-line-1",
              item: "Extra work",
              description: "",
              quantity: 1,
              unitPrice: 1000,
              discount: 0,
              taxRate: 18,
            },
          ],
        },
      }),
    );

    expect(html).toContain("Edit Draft Debit Note");
    expect(html).toContain("DN-0003");
    expect(html).toContain("Price revision");
  });
});
