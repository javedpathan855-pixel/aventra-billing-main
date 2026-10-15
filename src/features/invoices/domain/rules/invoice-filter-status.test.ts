import { describe, expect, it } from "vitest";
import { filterInvoices } from "./invoice-filter";
import {
  calculateInvoiceTotals,
  resolveInvoiceDisplayStatus,
  type Invoice,
} from "../invoice";

const base: Invoice = {
  id: "inv-1",
  number: "INV-0001",
  customer: "Acme",
  customerEmail: "",
  customerAddress: "",
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

const displayResolver = (invoice: Invoice) => {
  const totals = calculateInvoiceTotals(invoice);
  return resolveInvoiceDisplayStatus({
    status: invoice.status,
    total: totals.total,
    amountPaid: invoice.amountPaid,
    creditedAmount: totals.creditedAmount ?? 0,
    debitedAmount: totals.debitedAmount ?? 0,
    dueDate: invoice.dueDate,
    today: "2026-10-15",
  });
};

describe("invoice status filtering", () => {
  it("matches stored statuses by default", () => {
    const invoices = [
      base,
      { ...base, id: "inv-2", number: "INV-0002", status: "Draft" as const },
    ];
    expect(filterInvoices(invoices, { status: "Draft" }).map((i) => i.id)).toEqual(["inv-2"]);
    expect(filterInvoices(invoices, { status: "All" })).toHaveLength(2);
  });

  it("matches time-derived Overdue through the display resolver", () => {
    const invoices = [
      { ...base, id: "past-due", dueDate: "2026-10-01" },
      { ...base, id: "not-due", number: "INV-0002", dueDate: "2026-12-31" },
    ];
    expect(
      filterInvoices(invoices, { status: "Overdue", resolveStatus: displayResolver }).map(
        (i) => i.id,
      ),
    ).toEqual(["past-due"]);
    expect(
      filterInvoices(invoices, { status: "Issued", resolveStatus: displayResolver }).map(
        (i) => i.id,
      ),
    ).toEqual(["not-due"]);
  });
});
