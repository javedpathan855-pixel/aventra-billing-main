import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/purchase-returns",
  useSearchParams: () => new URLSearchParams(),
}));

import { PurchaseReturnListPage } from "./PurchaseReturnListPage";
import type { PurchaseReturn } from "../../domain/entities/purchase-return";

const purchaseReturn: PurchaseReturn = {
  id: "prt-1",
  organizationId: "org-1",
  returnNumber: "PR-0001",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  supplierEmail: "accounts@balaji.in",
  supplierAddress: "14 MG Road, Pune",
  supplierGstin: "27AABCS1234F1Z5",
  supplierPlaceOfSupply: "27-Maharashtra",
  purchaseBillId: "pb-1",
  purchaseBillNumber: "PB-0001",
  purchaseOrderId: null,
  purchaseOrderNumber: null,
  returnDate: "2026-10-14",
  reason: "Defective or damaged in transit",
  status: "APPROVED",
  taxMode: "CGST_SGST",
  currency: "INR (₹)",
  subtotal: 400,
  taxAmount: 72,
  totalAmount: 472,
  notes: null,
  terms: null,
  createdAt: new Date("2026-10-14T00:00:00.000Z"),
  updatedAt: new Date("2026-10-14T00:00:00.000Z"),
  items: [
    {
      id: "prti-1",
      purchaseReturnId: "prt-1",
      productId: null,
      purchaseBillItemId: "pbi-1",
      item: "Steel Rods",
      description: null,
      hsnSac: null,
      billedQuantity: 10,
      returnQuantity: 4,
      unitPrice: 100,
      discount: 0,
      taxRate: 18,
      taxAmount: 72,
      lineTotal: 472,
      disposition: "RESTOCK",
      reason: null,
      sortOrder: 0,
      createdAt: new Date("2026-10-14T00:00:00.000Z"),
      updatedAt: new Date("2026-10-14T00:00:00.000Z"),
    },
  ],
};

describe("Purchase Return List UI", () => {
  it("renders title, subtitle, and new-return navigation", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseReturnListPage, {
        initialReturns: [purchaseReturn],
        totalCount: 1,
      }),
    );

    expect(html).toContain("Purchase Returns");
    expect(html).toContain('href="/purchase-returns/new"');
    expect(html).toContain("New Purchase Return");
  });

  it("renders populated rows with supplier, bill reference, status, and detail navigation", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseReturnListPage, {
        initialReturns: [purchaseReturn],
        totalCount: 1,
      }),
    );

    expect(html).toContain("PR-0001");
    expect(html).toContain("Shree Balaji Traders");
    expect(html).toContain("PB-0001");
    expect(html).toContain("Approved");
    expect(html).toContain('href="/purchase-returns/prt-1"');
  });

  it("renders the empty state with a creation call to action", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseReturnListPage, { initialReturns: [] }),
    );

    expect(html).toContain("No purchase returns found");
    expect(html).toContain("Create Purchase Return");
  });

  it("renders search, status filter, and pagination controls", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseReturnListPage, {
        initialReturns: [purchaseReturn],
        totalCount: 41,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      }),
    );

    expect(html).toContain("Search by return #");
    expect(html).toContain("Completed");
  });
});
