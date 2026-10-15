import { describe, expect, it } from "vitest";
import {
  filterDebitNotes,
  summarizeDebitNotes,
} from "./debit-note-filter";
import type { DebitNote } from "../debit-note";

const note = (overrides: Partial<DebitNote> = {}): DebitNote => ({
  id: "dn-1",
  debitNoteNumber: "DN-0001",
  invoiceId: "inv-1",
  invoiceNumber: "INV-0001",
  customerName: "Acme",
  customerEmail: "billing@acme.com",
  customerAddress: "",
  customerGstin: "",
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
  notes: "",
  terms: "",
  items: [],
  ...overrides,
});

describe("filterDebitNotes", () => {
  const notes = [
    note({ id: "a", debitNoteNumber: "DN-0001", status: "Issued", total: 11800 }),
    note({ id: "b", debitNoteNumber: "DN-0002", status: "Draft", customerName: "Beta", total: 5900 }),
    note({ id: "c", debitNoteNumber: "DN-0003", status: "Cancelled", total: 200000 }),
  ];

  it("filters by query across number, customer, invoice, and reason", () => {
    expect(filterDebitNotes(notes, { query: "dn-0002" }).map((n) => n.id)).toEqual(["b"]);
    expect(filterDebitNotes(notes, { query: "beta" }).map((n) => n.id)).toEqual(["b"]);
    expect(filterDebitNotes(notes, { query: "under-billing" })).toHaveLength(3);
  });

  it("filters by status and amount range", () => {
    expect(filterDebitNotes(notes, { status: "Draft" }).map((n) => n.id)).toEqual(["b"]);
    expect(filterDebitNotes(notes, { amountRange: "over-100k" }).map((n) => n.id)).toEqual(["c"]);
  });

  it("sorts by amount and number", () => {
    expect(filterDebitNotes(notes, { sortBy: "amount-desc" }).map((n) => n.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(filterDebitNotes(notes, { sortBy: "number-asc" }).map((n) => n.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("summarizeDebitNotes", () => {
  it("separates issued, draft, and cancelled amounts", () => {
    const summary = summarizeDebitNotes([
      note({ status: "Issued", total: 11800 }),
      note({ id: "b", status: "Draft", total: 5900 }),
      note({ id: "c", status: "Cancelled", total: 100 }),
    ]);
    expect(summary.totalDebitNotes).toBe(3);
    expect(summary.totalDebitedAmount).toBe(11800);
    expect(summary.issuedCount).toBe(1);
    expect(summary.draftCount).toBe(1);
    expect(summary.draftAmount).toBe(5900);
    expect(summary.cancelledCount).toBe(1);
  });
});
