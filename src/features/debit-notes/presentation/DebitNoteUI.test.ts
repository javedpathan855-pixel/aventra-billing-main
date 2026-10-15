import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { DebitNote } from "../domain/debit-note";
import {
  calculateDebitNoteTotals,
  formatDebitNoteCurrency,
} from "../domain/debit-note";
import { summarizeDebitNotes } from "../domain/rules/debit-note-filter";
import { DebitNoteSummaryCards } from "./components/DebitNoteSummaryCards";
import { DebitNoteTable } from "./components/DebitNoteTable";
import { DebitNoteStatusBadge } from "./components/DebitNoteStatusBadge";
import { DebitNoteDocument } from "./components/DebitNoteDocument";
import { DebitNoteItemsSection } from "./components/DebitNoteItemsSection";

const mockDebitNote: DebitNote = {
  id: "dn-1",
  debitNoteNumber: "DN-2026-0001",
  invoiceId: "inv-1",
  invoiceNumber: "INV-2026-0001",
  customerId: "cust-1",
  customerName: "Acme Enterprises",
  customerEmail: "billing@acme.com",
  customerAddress: "Mumbai, Maharashtra",
  customerGstin: "27ABCDE1234F1Z5",
  customerPlaceOfSupply: "27-Maharashtra",
  issueDate: "2026-10-15",
  status: "Issued",
  reason: "Under-billing correction",
  taxMode: "CGST_SGST",
  currency: "INR (₹)",
  subtotal: 10000,
  lineDiscountTotal: 0,
  taxableAmount: 10000,
  cgst: 900,
  sgst: 900,
  igst: 0,
  totalTax: 1800,
  total: 11800,
  notes: "Additional billing for extra work",
  terms: "Payable within 15 days",
  items: [
    {
      id: "item-1",
      item: "Additional service",
      description: "Extra work",
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      taxRate: 18,
    },
  ],
  createdAt: "2026-10-15T10:00:00.000Z",
  updatedAt: "2026-10-15T10:00:00.000Z",
};

describe("debit note presentation", () => {
  it("renders status badges for all lifecycle states", () => {
    for (const status of ["Draft", "Issued", "Cancelled"] as const) {
      const html = renderToStaticMarkup(
        createElement(DebitNoteStatusBadge, { status }),
      );
      expect(html).toContain(status);
    }
  });

  it("renders the table with view action always and edit action only for drafts", () => {
    const html = renderToStaticMarkup(
      createElement(DebitNoteTable, {
        debitNotes: [
          mockDebitNote,
          { ...mockDebitNote, id: "dn-2", debitNoteNumber: "DN-0002", status: "Draft" },
        ],
        selectedIds: new Set<string>(),
        onToggleSelect: vi.fn(),
        onToggleSelectAll: vi.fn(),
        allOnPageSelected: false,
      }),
    );
    expect(html).toContain("DN-2026-0001");
    expect(html).toContain("DN-0002");
    expect(html).toContain("/debit-notes/dn-2");
    expect(html).toContain("debit-notes/new?edit=dn-2");
    expect(html).not.toContain("debit-notes/new?edit=dn-1");
  });

  it("renders summary cards with issued and draft amounts", () => {
    const html = renderToStaticMarkup(
      createElement(DebitNoteSummaryCards, {
        summary: summarizeDebitNotes([
          mockDebitNote,
          { ...mockDebitNote, id: "dn-2", status: "Draft", total: 5900 },
        ]),
      }),
    );
    expect(html).toContain("Total Debit Notes");
    expect(html).toContain("Total Debited Value");
    expect(html).toContain(formatDebitNoteCurrency(11800));
  });

  it("renders the document with totals matching the domain calculation", () => {
    const totals = calculateDebitNoteTotals(mockDebitNote);
    const html = renderToStaticMarkup(
      createElement(DebitNoteDocument, { debitNote: mockDebitNote }),
    );
    expect(html).toContain("DN-2026-0001");
    expect(html).toContain("Under-billing correction");
    expect(html).toContain(formatDebitNoteCurrency(totals.total));
    expect(html).toContain("Total Debit");
  });

  it("renders editable line items with validation errors", () => {
    const html = renderToStaticMarkup(
      createElement(DebitNoteItemsSection, {
        items: mockDebitNote.items,
        onUpdateLine: vi.fn(),
        onRemoveLine: vi.fn(),
        onAddLine: vi.fn(),
        errors: { "item-0": "Item name is required." },
      }),
    );
    expect(html).toContain("Debit Items &amp; Adjustments");
    expect(html).toContain("Additional service");
    expect(html).toContain("Item name is required.");
  });
});
