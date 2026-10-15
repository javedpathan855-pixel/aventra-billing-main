import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/purchase-orders",
  useSearchParams: () => new URLSearchParams(),
}));

import { PurchaseOrderListPage } from "./PurchaseOrderListPage";
import type { PurchaseOrder } from "../../domain/entities/purchase-order";

const order: PurchaseOrder = {
  id: "po-1",
  organizationId: "org-1",
  orderNumber: "PO-0001",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  supplierEmail: "accounts@balaji.in",
  supplierAddress: "14 MG Road, Pune",
  supplierGstin: "27AABCS1234F1Z5",
  supplierPlaceOfSupply: "27-Maharashtra",
  orderDate: "2026-10-14",
  expectedDeliveryDate: "2026-10-29",
  referenceNumber: "Q-100",
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
      id: "po-item-1",
      purchaseOrderId: "po-1",
      item: "Steel Rods",
      quantity: 10,
      receivedQuantity: 4,
      remainingQuantity: 6,
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

describe("Purchase Order List UI", () => {
  it("renders title, subtitle, and new-order navigation", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderListPage, {
        initialOrders: [order],
        totalCount: 1,
      }),
    );

    expect(html).toContain("Purchase Orders");
    expect(html).toContain('href="/purchase-orders/new"');
    expect(html).toContain("New Purchase Order");
  });

  it("renders populated rows with supplier, status, and detail navigation", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderListPage, {
        initialOrders: [order],
        totalCount: 1,
      }),
    );

    expect(html).toContain("PO-0001");
    expect(html).toContain("Shree Balaji Traders");
    expect(html).toContain("Confirmed");
    expect(html).toContain('href="/purchase-orders/po-1"');
  });

  it("renders the empty state with a creation call to action", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderListPage, { initialOrders: [] }),
    );

    expect(html).toContain("No purchase orders found");
    expect(html).toContain("Create Purchase Order");
  });

  it("renders search, status filter, and pagination controls", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderListPage, {
        initialOrders: [order],
        totalCount: 41,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      }),
    );

    expect(html).toContain("Search by order #");
    expect(html).toContain("Partially Received");
  });
});
