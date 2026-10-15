import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/purchase-bills",
  useSearchParams: () => new URLSearchParams(),
}));

import { PurchaseBillListPage } from "./PurchaseBillListPage";
import type { PurchaseBill } from "../../domain/entities/purchase-bill";

const bill: PurchaseBill = {
  id: "pb-1",
  organizationId: "org-1",
  billNumber: "PB-0001",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  supplierEmail: "accounts@balaji.in",
  supplierAddress: "14 MG Road, Pune",
  supplierGstin: "27AABCS1234F1Z5",
  supplierPlaceOfSupply: "27-Maharashtra",
  supplierInvoiceNumber: "INV-2026-118",
  supplierInvoiceDate: "2026-10-12",
  purchaseOrderId: "po-1",
  purchaseOrderNumber: "PO-0001",
  billDate: "2026-10-14",
  dueDate: "2026-11-13",
  status: "Confirmed",
  taxMode: "CGST_SGST",
  currency: "INR (₹)",
  paymentTerms: "Net 30 days",
  subtotal: 1000,
  lineDiscountTotal: 0,
  additionalDiscount: 0,
  additionalDiscountType: "fixed",
  additionalCharges: 0,
  taxableAmount: 1000,
  cgst: 90,
  sgst: 90,
  igst: 0,
  totalTax: 180,
  total: 1180,
  notes: null,
  terms: null,
  createdAt: new Date("2026-10-14T00:00:00.000Z"),
  updatedAt: new Date("2026-10-14T00:00:00.000Z"),
  items: [
    {
      id: "pb-item-1",
      purchaseBillId: "pb-1",
      item: "Steel Rods",
      quantity: 10,
      unitPrice: 100,
      discount: 0,
      taxRate: 18,
      taxableAmount: 1000,
      taxAmount: 180,
      lineTotal: 1180,
      sortOrder: 0,
    },
  ],
};

describe("Purchase Bill List UI", () => {
  it("renders title, subtitle, and new-bill navigation", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseBillListPage, {
        initialBills: [bill],
        totalCount: 1,
      }),
    );

    expect(html).toContain("Purchase Bills");
    expect(html).toContain('href="/purchase-bills/new"');
    expect(html).toContain("New Purchase Bill");
  });

  it("renders populated rows with supplier, invoice, status, and detail navigation", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseBillListPage, {
        initialBills: [bill],
        totalCount: 1,
      }),
    );

    expect(html).toContain("PB-0001");
    expect(html).toContain("Shree Balaji Traders");
    expect(html).toContain("INV-2026-118");
    expect(html).toContain("Confirmed");
    expect(html).toContain('href="/purchase-bills/pb-1"');
  });

  it("renders the empty state with a creation call to action", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseBillListPage, { initialBills: [] }),
    );

    expect(html).toContain("No purchase bills found");
    expect(html).toContain("Create Purchase Bill");
  });

  it("renders search, status filter, and pagination controls", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseBillListPage, {
        initialBills: [bill],
        totalCount: 41,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      }),
    );

    expect(html).toContain("Search by bill #");
    expect(html).toContain("Cancelled");
  });
});
