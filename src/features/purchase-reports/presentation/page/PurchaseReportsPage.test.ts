import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/purchase-reports",
  useSearchParams: () => new URLSearchParams(),
}));

import { PurchaseReportsPage } from "./PurchaseReportsPage";
import type { PurchaseReportsBundle } from "../../domain/entities/purchase-report";

const reports: PurchaseReportsBundle = {
  summary: {
    billCount: 1,
    grossPurchases: 1180,
    inputTax: 180,
    returnCount: 1,
    returnsTotal: 118,
    returnsTax: 18,
    netPurchases: 1062,
    netTax: 162,
  },
  bySupplier: [
    {
      supplierId: "sup-1",
      supplierName: "Shree Balaji Traders",
      billCount: 1,
      grossPurchases: 1180,
      inputTax: 180,
      returnsTotal: 118,
      netPurchases: 1062,
      outstanding: 680,
    },
  ],
  outstanding: {
    rows: [
      {
        billId: "pb-1",
        billNumber: "PB-0001",
        supplierId: "sup-1",
        supplierName: "Shree Balaji Traders",
        billDate: "2026-10-05",
        dueDate: "2026-11-04",
        total: 1180,
        paidAmount: 500,
        outstanding: 680,
      },
    ],
    totalOutstanding: 680,
    billCount: 1,
    truncated: false,
  },
  tax: {
    grossPurchases: 1180,
    cgst: 90,
    sgst: 90,
    igst: 0,
    inputTax: 180,
    returnsTotal: 118,
    returnsTax: 18,
    netPurchases: 1062,
    netTax: 162,
  },
  payments: {
    paymentCount: 1,
    totalPaid: 500,
    byMethod: [{ method: "BANK_TRANSFER", paymentCount: 1, totalPaid: 500 }],
    bySupplier: [
      {
        supplierId: "sup-1",
        supplierName: "Shree Balaji Traders",
        paymentCount: 1,
        totalPaid: 500,
      },
    ],
  },
  orders: {
    rows: [{ status: "Confirmed", count: 1, total: 2360 }],
    totalOrders: 1,
    totalAmount: 2360,
  },
  returns: {
    rows: [{ status: "Completed", count: 1, total: 118 }],
    returnCount: 1,
    returnsTotal: 118,
    returnsTax: 18,
  },
};

describe("Purchase Reports UI", () => {
  it("renders every report section with reconciled figures", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseReportsPage, {
        reports,
        suppliers: [{ id: "sup-1", name: "Shree Balaji Traders" }],
      }),
    );

    expect(html).toContain("Purchase Reports");
    expect(html).toContain("Report Filters");
    expect(html).toContain("Gross Purchases");
    expect(html).toContain("Net Purchases");
    expect(html).toContain("Outstanding Payables");
    expect(html).toContain("Purchases by Supplier");
    expect(html).toContain("Shree Balaji Traders");
    expect(html).toContain("Input Tax Summary");
    expect(html).toContain("Net input tax");
    expect(html).toContain("Supplier Payments");
    expect(html).toContain("BANK_TRANSFER");
    expect(html).toContain("Orders &amp; Returns by Status");
    expect(html).toContain("PB-0001");
    expect(html).toContain("Reconciliation");
  });

  it("renders empty states when no data matches", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseReportsPage, {
        reports: {
          ...reports,
          bySupplier: [],
          outstanding: {
            rows: [],
            totalOutstanding: 0,
            billCount: 0,
            truncated: false,
          },
          payments: { paymentCount: 0, totalPaid: 0, byMethod: [], bySupplier: [] },
        },
      }),
    );

    expect(html).toContain("No supplier activity matches");
    expect(html).toContain("fully paid");
    expect(html).toContain("No payments in scope.");
  });
});
