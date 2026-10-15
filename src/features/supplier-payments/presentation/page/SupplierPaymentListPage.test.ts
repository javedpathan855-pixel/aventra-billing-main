import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/supplier-payments",
  useSearchParams: () => new URLSearchParams(),
}));

import { SupplierPaymentListPage } from "./SupplierPaymentListPage";
import type { SupplierPayment } from "../../domain/supplier-payment";

const payment: SupplierPayment = {
  id: "spay-1",
  organizationId: "org-1",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  amount: 1180,
  currency: "INR (₹)",
  paymentDate: "2026-10-14",
  method: "Bank Transfer",
  reference: "UTR123",
  notes: "",
  status: "Active",
  allocations: [
    {
      id: "spalloc-1",
      purchaseBillId: "pb-1",
      billNumber: "PB-0001",
      amount: 1180,
    },
  ],
};

describe("Supplier Payment List UI", () => {
  it("renders title, subtitle, and record-payment navigation", () => {
    const html = renderToStaticMarkup(
      createElement(SupplierPaymentListPage, {
        initialPayments: [payment],
        totalCount: 1,
      }),
    );

    expect(html).toContain("Supplier Payments");
    expect(html).toContain('href="/supplier-payments/new"');
    expect(html).toContain("Record Payment");
  });

  it("renders populated rows with supplier, method, and detail navigation", () => {
    const html = renderToStaticMarkup(
      createElement(SupplierPaymentListPage, {
        initialPayments: [payment],
        totalCount: 1,
      }),
    );

    expect(html).toContain("Shree Balaji Traders");
    expect(html).toContain("Bank Transfer");
    expect(html).toContain("UTR123");
    expect(html).toContain("Active");
    expect(html).toContain('href="/supplier-payments/spay-1"');
  });

  it("renders the empty state with a creation call to action", () => {
    const html = renderToStaticMarkup(
      createElement(SupplierPaymentListPage, { initialPayments: [] }),
    );

    expect(html).toContain("No supplier payments found");
    expect(html).toContain("Record Supplier Payment");
  });

  it("renders search, status, method, and pagination controls", () => {
    const html = renderToStaticMarkup(
      createElement(SupplierPaymentListPage, {
        initialPayments: [payment],
        totalCount: 41,
        page: 1,
        pageSize: 20,
        totalPages: 3,
      }),
    );

    expect(html).toContain("Search by supplier");
    expect(html).toContain("Reversed");
    expect(html).toContain("Bank Transfer");
  });
});
