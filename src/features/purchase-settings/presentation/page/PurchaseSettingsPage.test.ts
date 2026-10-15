import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("../../data/mutations/save-purchase-settings", () => ({
  savePurchaseSettingsAction: vi.fn(),
}));

import { PurchaseSettingsPage } from "./PurchaseSettingsPage";
import type { PurchaseSettings } from "../../domain/entities/purchase-settings";

const settings: PurchaseSettings = {
  id: "pset-1",
  organizationId: "org-1",
  purchaseOrderPrefix: "PO-",
  purchaseOrderSuffix: null,
  purchaseOrderNextNumber: 7,
  purchaseOrderPadding: 4,
  defaultDeliveryDays: 15,
  defaultPaymentTerms: "Net 30 days",
  defaultPurchaseOrderNotes: "Deliver to Gate 2.",
  defaultPurchaseOrderTerms: "Inspect on arrival.",
  purchaseBillPrefix: "PB-",
  purchaseBillSuffix: null,
  purchaseBillNextNumber: 3,
  purchaseBillPadding: 4,
  defaultDueDays: 30,
  defaultPurchaseBillNotes: "Match before paying.",
  defaultPurchaseBillTerms: "Pay after matching.",
  purchaseReturnPrefix: "PR-",
  purchaseReturnSuffix: null,
  purchaseReturnNextNumber: 3,
  purchaseReturnPadding: 4,
  defaultPurchaseReturnReason: "Defective or damaged in transit",
  defaultPurchaseReturnNotes: "Arrange return pickup.",
  defaultPurchaseReturnTerms: "Inspect before credit.",
  createdAt: new Date("2026-10-15T00:00:00.000Z"),
  updatedAt: new Date("2026-10-15T00:00:00.000Z"),
};

describe("Purchase Settings page composition", () => {
  it("renders the header, isolation context, tabs, and actions", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseSettingsPage, { initialSettings: settings }),
    );

    expect(html).toContain("Purchase Settings");
    expect(html).toContain("Independent Numbering");
    expect(html).toContain("Purchase Orders");
    expect(html).toContain("Purchase Bills");
    expect(html).toContain("Purchase Returns");
    expect(html).toContain("Save Settings");
    expect(html).toContain("Reset to Defaults");
  });

  it("renders the purchase orders tab by default", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseSettingsPage, { initialSettings: settings }),
    );

    expect(html).toContain("Purchase Order Numbering Configuration");
    expect(html).toContain("Purchase Order Defaults");
    expect(html).toContain("Next Purchase Order Number Preview");
    expect(html).toContain("PO-0007");
    expect(html).toContain("Net 30 days");
    expect(html).not.toContain("Purchase Bill Numbering Configuration");
    expect(html).not.toContain("Purchase Return Numbering Configuration");
  });

  it("renders the live preview through the extracted preview component", () => {
    const html = renderToStaticMarkup(
      createElement(PurchaseSettingsPage, {
        initialSettings: { ...settings, purchaseOrderNextNumber: 42 },
      }),
    );

    expect(html).toContain("PO-0042");
  });
});
