import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DeliveryChallanCreatePage } from "./DeliveryChallanCreatePage";
import type { DeliverableSalesOrder } from "../../domain/entities/delivery-challan";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("../../data/mutations/create-delivery-challan", () => ({
  createDeliveryChallanAction: vi.fn(),
}));

const mockDeliverableOrders: DeliverableSalesOrder[] = [
  {
    id: "so-1",
    orderNumber: "SO-2026-0001",
    orderDate: new Date("2026-10-01"),
    customerId: "cust-1",
    customerName: "Acme Industrial Corp",
    customerEmail: "finance@acme.com",
    customerAddress: "45 MIDC Phase II, Nagpur, Maharashtra 440028",
    customerGstin: "27AABCB1234F1Z1",
    status: "CONFIRMED",
    items: [
      {
        id: "so-item-1",
        productId: "prod-1",
        item: "Heavy Industrial Pump",
        description: "5HP Centrifugal Submersible Pump",
        hsnSac: "841370",
        unit: "PCS",
        orderedQuantity: 10,
        previouslyDeliveredQuantity: 2,
        remainingDeliverableQuantity: 8,
      },
    ],
  },
];

describe("DeliveryChallanCreatePage Presentation & Style Parity", () => {
  it("renders with exact Sales Order layout style and sections", () => {
    const html = renderToStaticMarkup(
      createElement(DeliveryChallanCreatePage, {
        deliverableOrders: mockDeliverableOrders,
        defaultNumberPreview: "DC-0001",
        defaultInstructions: "Handle with care.",
        defaultTerms: "Goods once dispatched will not be taken back.",
      }),
    );

    // Back link + header
    expect(html).toContain("Back to Delivery Challans");
    expect(html).toContain("New Delivery Challan");
    expect(html).toContain("Preview Document");

    // Section 1: Dispatch & Customer Details
    expect(html).toContain("Dispatch &amp; Customer Details");
    expect(html).toContain("Source Sales Order");
    expect(html).toContain("Challan Number");
    expect(html).toContain("Challan Date");
    expect(html).toContain("Expected Dispatch");

    // Section 2: Items Table
    expect(html).toContain("Delivery Items");
    expect(html).toContain("Add Custom Item");

    // Section 3: Transport + Summary side-by-side
    expect(html).toContain("Transportation &amp; Vehicle");
    expect(html).toContain("Dispatch Summary");

    // Section 4: Notes & Terms
    expect(html).toContain("Delivery Notes &amp; Terms");

    // Bottom Action Bar
    expect(html).toContain("Cancel");
    expect(html).toContain("Save &amp; Generate Challan");

    // Manual customer fallback visible while no order is selected
    // (snapshot card replaces these inputs once an order is chosen)
    expect(html).toContain("delivery-challan-customer-name");
  });

  it("strictly uses shared DatePicker component and never native date inputs", () => {
    const html = renderToStaticMarkup(
      createElement(DeliveryChallanCreatePage, {
        deliverableOrders: mockDeliverableOrders,
        defaultNumberPreview: "DC-0001",
      }),
    );

    // Shared DatePicker renders a button trigger with calendar icon, never type="date"
    expect(html).not.toContain('type="date"');
    expect(html).toContain("delivery-challan-date");
    expect(html).toContain("delivery-challan-dispatch-date");
  });
});
