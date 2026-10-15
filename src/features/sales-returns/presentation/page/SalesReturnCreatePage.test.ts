import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SalesReturnCreatePage } from "./SalesReturnCreatePage";
import type { ReturnableInvoice } from "../../domain/entities/sales-return";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../data/mutations/create-sales-return", () => ({
  createSalesReturnAction: vi.fn(),
}));

vi.mock("../../data/mutations/update-sales-return-status", () => ({
  updateSalesReturnStatusAction: vi.fn(),
}));

const mockReturnableInvoices: ReturnableInvoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-0001",
    invoiceDate: new Date("2026-10-01"),
    customerId: "cust-1",
    customerName: "Acme Industrial Corp",
    customerEmail: "finance@acme.com",
    customerAddress: "45 MIDC Phase II, Nagpur, Maharashtra 440028",
    customerGstin: "27AABCB1234F1Z1",
    customerPlaceOfSupply: "27-Maharashtra",
    taxMode: "CGST_SGST",
    currency: "INR (₹)",
    items: [
      {
        id: "inv-item-1",
        productId: "prod-1",
        item: "Heavy Industrial Pump",
        description: "5HP Centrifugal Submersible Pump",
        hsnSac: "841370",
        unit: "PCS",
        soldQuantity: 10,
        previouslyReturnedQuantity: 2,
        remainingReturnableQuantity: 8,
        unitPrice: 10000,
        discount: 0,
        taxRate: 18,
      },
    ],
  },
];

describe("SalesReturnCreatePage Presentation & Style Parity", () => {
  it("renders with exact Sales Order layout style and sections", () => {
    const html = renderToStaticMarkup(
      createElement(SalesReturnCreatePage, {
        returnableInvoices: mockReturnableInvoices,
        defaultNumberPreview: "SR-0001",
        defaultReason: "Defective in transit",
        defaultPolicy: "Standard 30-day inspection warranty.",
      }),
    );

    // Section 1: Customer & Return Details
    expect(html).toContain("Return &amp; Customer Details");
    expect(html).toContain("Original Invoiced Sale");
    expect(html).toContain("Return Number");
    expect(html).toContain("Return Date");
    expect(html).toContain("Return Reason");

    // Section 2: Items Table
    expect(html).toContain("Return Items");
    expect(html).toContain("Add Custom Item");

    // Section 3: Policy Notes & Return Summary Side-by-Side
    expect(html).toContain("Return Terms &amp; Policy Notes");
    expect(html).toContain("Automatic Credit Note Integration");
    expect(html).toContain("Return Summary");
    expect(html).toContain("GST Tax Mode");
    expect(html).toContain("Total Return Value");

    // Section 4: Bottom Action Bar
    expect(html).toContain("Cancel");
    expect(html).toContain("Save as Draft");
    expect(html).toContain("Confirm &amp; Authorize");
  });

  it("strictly uses shared DatePicker component and never native date inputs", () => {
    const html = renderToStaticMarkup(
      createElement(SalesReturnCreatePage, {
        returnableInvoices: mockReturnableInvoices,
        defaultNumberPreview: "SR-0001",
      }),
    );

    // Shared DatePicker renders a button trigger with calendar icon, never type="date"
    expect(html).not.toContain('type="date"');
    expect(html).toContain("sales-return-date");
  });
});
