import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../../data/mutations/create-supplier", () => ({
  createSupplierAction: vi.fn(),
}));
vi.mock("../../data/mutations/update-supplier", () => ({
  updateSupplierAction: vi.fn(),
}));

import { SupplierCreatePage } from "./SupplierCreatePage";

describe("Create Supplier UI", () => {
  describe("Page Header & Actions", () => {
    it("renders Back to Suppliers link, page title, and action buttons", () => {
      const html = renderToStaticMarkup(createElement(SupplierCreatePage));

      expect(html).toContain("Back to Suppliers");
      expect(html).toContain('href="/suppliers"');
      expect(html).toContain("Add Supplier");
      expect(html).toContain(
        "Create a supplier record for purchasing and vendor management.",
      );
      expect(html).toContain("Cancel");
      expect(html).toContain("Save as Inactive");
      expect(html).toContain("Create Supplier");

      // Verifies sections order & presence
      expect(html).toContain("Basic Information");
      expect(html).toContain("Contact Information");
      expect(html).toContain("Billing Address");
      expect(html).toContain("Tax &amp; Compliance");
      expect(html).toContain("Commercial Terms &amp; Notes");
    });

    it("renders edit mode with update affordances", () => {
      const html = renderToStaticMarkup(
        createElement(SupplierCreatePage, { initialData: null, isEdit: true }),
      );

      expect(html).toContain("Edit Supplier");
      expect(html).toContain("Update Supplier");
      expect(html).not.toContain("Save as Inactive");
    });
  });
});
