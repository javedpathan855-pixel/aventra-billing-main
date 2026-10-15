import { describe, expect, it } from "vitest";
import {
  dashboardNavigationSections,
  getCategoryDescription,
  getSectionForPathname,
  getSidebarItems,
  isActiveRoute,
  sidebarOpacityForDistance,
} from "./dashboardNavigation";

const items = dashboardNavigationSections.flatMap((section) => section.items);

describe("dashboard mega menu navigation", () => {
  it("contains the 14 roadmap categories in product order", () => {
    expect(dashboardNavigationSections.map((section) => section.label)).toEqual([
      "Dashboard",
      "Sales",
      "Billing",
      "Purchases",
      "Expenses",
      "Tax & GST",
      "Products & Services",
      "Inventory & Stock",
      "Parties & Contacts",
      "Banking & Accounting",
      "Reports",
      "Organization & Team",
      "Settings & Integrations",
      "Account & Support",
    ]);
  });

  it("keeps the finalized item count for each category", () => {
    expect(dashboardNavigationSections.map((section) => section.items.length)).toEqual([
      3, 6, 5, 6, 4, 10, 6, 7, 5, 8, 9, 6, 8, 5,
    ]);
  });

  it("includes the required roadmap item metadata", () => {
    const requiredTitles = [
      "Organization Overview",
      "Invoices",
      "Purchase Orders",
      "Expenses",
      "E-Invoice",
      "E-Way Bill",
      "Chart of Accounts",
      "Journal Entries",
      "Integrations",
      "Import & Export",
      "Document Numbering",
      "Billing Settings",
      "Sales Settings",
      "Tax Settings",
      "Inventory Settings",
      "Notification Settings",
      "Help & Support",
    ];

    expect(requiredTitles.every((title) => items.some((item) => item.title === title))).toBe(true);

    for (const section of dashboardNavigationSections) {
      expect(section.items.length).toBeGreaterThan(0);
      for (const item of section.items) {
        expect(item.id).not.toBe("");
        expect(item.title).not.toBe("");
        expect(item.description).not.toBe("");
        expect(item.icon).toBeDefined();
        expect(["available", "planned"]).toContain(item.availability);
      }
    }
  });

  it("uses unique IDs and never gives planned items a fake href", () => {
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of items) {
      if (item.availability === "planned") {
        expect("href" in item).toBe(false);
      }
    }
  });

  it("has exactly the verified active routes", () => {
    const available = items.filter((item) => item.availability === "available");

    expect(available).toHaveLength(18);
    expect(available.map((item) => item.href).sort()).toEqual([
      "/credit-notes",
      "/customers",
      "/dashboard",
      "/debit-notes",
      "/delivery-challans",
      "/estimates",
      "/invoices",
      "/organization",
      "/payments",
      "/products",
      "/recurring-invoices",
      "/sales-orders",
      "/sales-pipeline",
      "/sales-returns",
      "/services",
      "/settings/billing",
      "/settings/sales",
      "/suppliers",
    ]);
    expect(new Set(available.map((item) => item.href)).size).toBe(18);

    const customersItem = items.find((item) => item.id === "sales-customers");
    expect(customersItem).toBeDefined();
    expect(customersItem?.availability).toBe("available");
    if (customersItem?.availability === "available") {
      expect(customersItem.href).toBe("/customers");
    }

    const estimatesItem = items.find((item) => item.id === "sales-estimates");
    expect(estimatesItem).toBeDefined();
    expect(estimatesItem?.availability).toBe("available");
    if (estimatesItem?.availability === "available") {
      expect(estimatesItem.href).toBe("/estimates");
    }

    const salesOrdersItem = items.find((item) => item.id === "sales-orders");
    expect(salesOrdersItem).toBeDefined();
    expect(salesOrdersItem?.availability).toBe("available");
    if (salesOrdersItem?.availability === "available") {
      expect(salesOrdersItem.href).toBe("/sales-orders");
    }

    const invoicesItem = items.find((item) => item.id === "billing-invoices");
    expect(invoicesItem).toBeDefined();
    expect(invoicesItem?.availability).toBe("available");
    if (invoicesItem?.availability === "available") {
      expect(invoicesItem.href).toBe("/invoices");
    }

    const productsItem = items.find((item) => item.id === "products-products");
    expect(productsItem).toBeDefined();
    expect(productsItem?.availability).toBe("available");
    if (productsItem?.availability === "available") {
      expect(productsItem.href).toBe("/products");
    }

    const servicesItem = items.find((item) => item.id === "products-services");
    expect(servicesItem).toBeDefined();
    expect(servicesItem?.availability).toBe("available");
    if (servicesItem?.availability === "available") {
      expect(servicesItem.href).toBe("/services");
    }

    const billingSettingsItem = items.find((item) => item.id === "settings-billing");
    expect(billingSettingsItem).toBeDefined();
    expect(billingSettingsItem?.availability).toBe("available");
    if (billingSettingsItem?.availability === "available") {
      expect(billingSettingsItem.href).toBe("/settings/billing");
    }

    const salesSettingsItem = items.find((item) => item.id === "settings-sales");
    expect(salesSettingsItem).toBeDefined();
    expect(salesSettingsItem?.availability).toBe("available");
    if (salesSettingsItem?.availability === "available") {
      expect(salesSettingsItem.href).toBe("/settings/sales");
    }

    const suppliersItem = items.find((item) => item.id === "purchases-suppliers");
    expect(suppliersItem).toBeDefined();
    expect(suppliersItem?.availability).toBe("available");
    if (suppliersItem?.availability === "available") {
      expect(suppliersItem.href).toBe("/suppliers");
    }
  });

  it("contains the complete roadmap item count", () => {
    expect(items).toHaveLength(88);
  });
});

describe("dashboard sidebar route resolution", () => {
  it("matches exact routes and nested routes, but never the dashboard root loosely", () => {
    expect(isActiveRoute("/invoices", "/invoices")).toBe(true);
    expect(isActiveRoute("/invoices", "/invoices/")).toBe(true);
    expect(isActiveRoute("/invoices", "/invoices/abc-123")).toBe(true);
    expect(isActiveRoute("/invoices", "/invoices/new")).toBe(true);
    expect(isActiveRoute("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveRoute("/dashboard", "/dashboard/")).toBe(false);
    expect(isActiveRoute("/dashboard", "/dashboard-anything")).toBe(false);
    expect(isActiveRoute("/credit-notes", "/invoices")).toBe(false);
  });

  it("avoids false active states caused by overlapping route prefixes", () => {
    // /recurring-invoices must NEVER match /invoices
    expect(isActiveRoute("/invoices", "/recurring-invoices")).toBe(false);
    expect(isActiveRoute("/invoices", "/recurring-invoices/new")).toBe(false);
    expect(isActiveRoute("/invoices", "/recurring-invoices/rec-123")).toBe(false);

    // /settings must not match /settings/billing, and /settings/billing must not match /settings
    expect(isActiveRoute("/settings/billing", "/settings")).toBe(false);
    expect(isActiveRoute("/settings/billing", "/settings/billing")).toBe(true);
    expect(isActiveRoute("/settings/billing", "/settings/billing/preferences")).toBe(true);
  });

  it("resolves the owning category from list, detail, and creation routes", () => {
    expect(getSectionForPathname("/invoices")?.label).toBe("Billing");
    expect(getSectionForPathname("/invoices/inv-1")?.label).toBe("Billing");
    expect(getSectionForPathname("/credit-notes/new")?.label).toBe("Billing");
    expect(getSectionForPathname("/payments/pay-9")?.label).toBe("Billing");
    expect(getSectionForPathname("/customers")?.label).toBe("Sales");
    expect(getSectionForPathname("/customers/c-1/edit")?.label).toBe("Sales");
    expect(getSectionForPathname("/estimates")?.label).toBe("Sales");
    expect(getSectionForPathname("/estimates/est-1")?.label).toBe("Sales");
    expect(getSectionForPathname("/estimates/new")?.label).toBe("Sales");
    expect(getSectionForPathname("/sales-orders")?.label).toBe("Sales");
    expect(getSectionForPathname("/sales-orders/so-1")?.label).toBe("Sales");
    expect(getSectionForPathname("/sales-orders/new")?.label).toBe("Sales");
    expect(getSectionForPathname("/products")?.label).toBe("Products & Services");
    expect(getSectionForPathname("/settings/billing")?.label).toBe("Settings & Integrations");
    expect(getSectionForPathname("/settings/sales")?.label).toBe("Settings & Integrations");
    expect(getSectionForPathname("/dashboard")?.label).toBe("Dashboard");
  });

  it("returns undefined for routes with no implemented destination", () => {
    expect(getSectionForPathname("/no-such-route")).toBeUndefined();
    expect(getSectionForPathname("/")).toBeUndefined();
  });

  it("exposes only working destinations per category", () => {
    const billing = dashboardNavigationSections.find((s) => s.label === "Billing");
    expect(billing).toBeDefined();
    expect(getSidebarItems(billing!).map((item) => item.href)).toEqual([
      "/invoices",
      "/credit-notes",
      "/debit-notes",
      "/payments",
      "/recurring-invoices",
    ]);

    const sales = dashboardNavigationSections.find((s) => s.label === "Sales");
    expect(sales).toBeDefined();
    expect(getSidebarItems(sales!).map((item) => item.href)).toEqual([
      "/customers",
      "/estimates",
      "/sales-orders",
      "/sales-returns",
      "/sales-pipeline",
      "/delivery-challans",
    ]);

    const settings = dashboardNavigationSections.find(
      (s) => s.label === "Settings & Integrations",
    );
    expect(settings).toBeDefined();
    expect(getSidebarItems(settings!).map((item) => item.href)).toEqual([
      "/settings/billing",
      "/settings/sales",
    ]);
  });

  it("steps opacity down with distance and never fades the active item", () => {
    expect(sidebarOpacityForDistance(0)).toBe("opacity-100");
    expect(sidebarOpacityForDistance(-1)).toBe("opacity-100");
    expect(sidebarOpacityForDistance(1)).toBe("opacity-75");
    expect(sidebarOpacityForDistance(2)).toBe("opacity-50");
    expect(sidebarOpacityForDistance(3)).toBe("opacity-40");
    expect(sidebarOpacityForDistance(20)).toBe("opacity-40");
  });

  it("provides tailored category descriptions for all roadmap categories", () => {
    for (const section of dashboardNavigationSections) {
      const description = getCategoryDescription(section.label);
      expect(description).toBeDefined();
      expect(description.length).toBeGreaterThan(10);
    }
    expect(getCategoryDescription("Billing")).toBe("Invoicing, adjustments & payment tracking");
    expect(getCategoryDescription("Sales")).toBe("Customer records & sales operations");
  });
});
