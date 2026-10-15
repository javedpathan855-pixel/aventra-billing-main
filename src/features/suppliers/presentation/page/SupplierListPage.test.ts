import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { SupplierListPage } from "./SupplierListPage";
import type { SupplierDto } from "../../data/dto/supplier-dto";

const address = {
  addressLine1: "14 MG Road",
  city: "Pune",
  state: "Maharashtra",
  pinCode: "411001",
  country: "India",
};

const supplier: SupplierDto = {
  id: "sup-1",
  organizationId: "org-1",
  name: "Shree Balaji Traders",
  status: "ACTIVE",
  contactPerson: "Ramesh Gupta",
  email: "accounts@balaji.in",
  phone: "+91 98220 00000",
  alternatePhone: null,
  billingAddress: address,
  shippingAddress: address,
  sameAsBillingAddress: true,
  gstTreatment: "REGISTERED_BUSINESS_REGULAR",
  gstin: "27AABCS1234F1Z5",
  pan: "AABCS1234F",
  currency: "INR (₹)",
  paymentTerms: "Net 30 days",
  internalNotes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Supplier List UI", () => {
  describe("Page Header & Actions", () => {
    it("renders title, subtitle, and add-supplier navigation", () => {
      const html = renderToStaticMarkup(
        createElement(SupplierListPage, {
          initialSuppliers: [supplier],
          totalCount: 1,
        }),
      );

      expect(html).toContain("Suppliers");
      expect(html).toContain("Manage supplier records and purchase information.");
      expect(html).toContain('href="/suppliers/new"');
      expect(html).toContain("Add Supplier");
    });
  });

  describe("Populated, Empty, and Filtered States", () => {
    it("renders supplier rows with detail navigation", () => {
      const html = renderToStaticMarkup(
        createElement(SupplierListPage, {
          initialSuppliers: [supplier],
          totalCount: 1,
        }),
      );

      expect(html).toContain("Shree Balaji Traders");
      expect(html).toContain('href="/suppliers/sup-1"');
      expect(html).toContain("27AABCS1234F1Z5");
      expect(html).toContain("Active");
    });

    it("renders the empty state with a creation path", () => {
      const html = renderToStaticMarkup(createElement(SupplierListPage));

      expect(html).toContain("No suppliers yet");
      expect(html).toContain('href="/suppliers/new"');
    });

    it("renders the no-results state when filters exclude everything", () => {
      const html = renderToStaticMarkup(
        createElement(SupplierListPage, {
          initialSuppliers: [],
          totalCount: 0,
          initialQuery: "zzz-no-match",
        }),
      );

      expect(html).toContain("No matching suppliers");
    });

    it("renders the saved confirmation banner", () => {
      const html = renderToStaticMarkup(
        createElement(SupplierListPage, {
          initialSuppliers: [supplier],
          totalCount: 1,
          showSavedBanner: true,
        }),
      );

      expect(html).toContain("Supplier record saved successfully.");
    });
  });

  describe("Shared Component Discipline", () => {
    it("renders filter controls through shared component markers", () => {
      const html = renderToStaticMarkup(
        createElement(SupplierListPage, {
          initialSuppliers: [supplier],
          totalCount: 1,
        }),
      );

      // Shared Input (search), shared Select (status), shared Pagination wiring.
      expect(html).toContain('id="supplier-search"');
      expect(html).toContain('id="filter-supplier-status"');
      // No native date pickers anywhere on the page.
      expect(html).not.toContain('type="date"');
    });
  });
});
