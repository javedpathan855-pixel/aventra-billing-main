import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/purchase-orders",
  useSearchParams: () => new URLSearchParams(),
}));

import { PurchaseOrderItemsSection } from "./PurchaseOrderItemsSection";
import type { PurchaseOrderItem } from "../../domain/entities/purchase-order";
import type { ProductDto } from "@/features/products";

const line = (overrides: Partial<PurchaseOrderItem> = {}): PurchaseOrderItem => ({
  id: "line-1",
  item: "",
  description: "",
  hsnSac: "",
  quantity: 2,
  receivedQuantity: 0,
  remainingQuantity: 2,
  unitPrice: 500,
  discount: 10,
  taxRate: 18,
  taxableAmount: 900,
  taxAmount: 162,
  lineTotal: 1062,
  sortOrder: 0,
  ...overrides,
});

const product: ProductDto = {
  id: "prod-1",
  organizationId: "org-1",
  name: "Industrial Steel Rod 12mm Extra Long Custom Alloy Variant",
  type: "PRODUCT",
  sku: "STL-12",
  category: null,
  status: "ACTIVE",
  description: "High-tensile structural rod",
  sellingPrice: 600,
  purchasePrice: 500,
  currency: "INR (₹)",
  unit: "PCS",
  hsnSac: "7214",
  taxRate: 18,
  taxPreference: "Taxable",
  trackInventory: false,
  reorderPoint: null,
  internalNotes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const noop = () => {};

describe("Purchase Order items section (invoice-aligned layout)", () => {
  it("renders invoice-style headers, row numbers, and computed amounts", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderItemsSection, {
        items: [line(), line({ id: "line-2", quantity: 1, unitPrice: 100, discount: 0, taxRate: 0 })],
        onUpdateLine: noop,
        onAddLine: noop,
        onRemoveLine: noop,
        availableProducts: [],
      }),
    );

    expect(html).toContain("Order Items");
    expect(html).toContain("Item / Description");
    expect(html).toContain("HSN / SAC");
    expect(html).toContain("Unit Price");
    // 2 × 500 − 10% = 900 taxable + 18% = 1062.00
    expect(html).toContain("₹1,062.00");
    expect(html).toContain("Add Item");
  });

  it("lists catalogue products with purchase pricing and supports custom entry", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderItemsSection, {
        items: [line()],
        onUpdateLine: noop,
        onAddLine: noop,
        onRemoveLine: noop,
        availableProducts: [product],
      }),
    );

    expect(html).toContain("Industrial Steel Rod 12mm Extra Long Custom Alloy Variant");
    expect(html).toContain("Custom product...");
  });

  it("shows the free-text name field for unmatched custom items", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderItemsSection, {
        items: [line({ item: "One-off fabrication job" })],
        onUpdateLine: noop,
        onAddLine: noop,
        onRemoveLine: noop,
        availableProducts: [product],
      }),
    );

    expect(html).toContain("One-off fabrication job");
    expect(html).toContain("Item name");
  });

  it("surfaces line validation errors without breaking the row layout", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderItemsSection, {
        items: [line()],
        onUpdateLine: noop,
        onAddLine: noop,
        onRemoveLine: noop,
        availableProducts: [],
        errors: {
          items: "A Purchase Order must contain at least one line item.",
          "items.0.quantity": "Quantity must be greater than zero.",
        },
      }),
    );

    expect(html).toContain("must contain at least one line item");
    expect(html).toContain("Quantity must be greater than zero.");
  });

  it("disables row removal for a single line item", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseOrderItemsSection, {
        items: [line()],
        onUpdateLine: noop,
        onAddLine: noop,
        onRemoveLine: noop,
        availableProducts: [],
      }),
    );

    expect(html).toContain("Remove item 1");
    expect(html).toContain("disabled");
  });
});
