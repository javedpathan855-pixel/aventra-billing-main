import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { usePathname } from "next/navigation";
import { DashboardSidebar } from "./DashboardSidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const mockPathname = (path: string) => {
  vi.mocked(usePathname).mockReturnValue(path);
};

describe("DashboardSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Billing items with the active route highlighted on a deep link", () => {
    mockPathname("/invoices/inv-123");

    const html = renderToStaticMarkup(createElement(DashboardSidebar));

    for (const label of ["Invoices", "Credit notes", "Debit notes", "Payments received", "Recurring invoices"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Customers");
    expect(html).toContain('href="/invoices"');
    expect(html).toContain('aria-current="page"');
    // Active item: full opacity, highlighted text and icon only, no background pill or indicator bar.
    expect(html).toContain("opacity-100");
    expect(html).toContain("text-primary-light");
    expect(html).toContain("text-text-primary");
    expect(html).not.toContain("bg-surface-alt");
    expect(html).not.toContain("bg-primary-light");
    expect(html).not.toContain("hover:bg-");
    expect(html).toContain("text-base");
    expect(html).toContain("h-5 w-5");
  });

  it("switches to the same sidebar showing Sales items on a sales route", () => {
    mockPathname("/customers");

    const html = renderToStaticMarkup(createElement(DashboardSidebar));

    expect(html).toContain("Customers");
    expect(html).not.toContain("Invoices");
    expect(html).not.toContain("Credit notes");
    expect(html).toContain('aria-current="page"');
  });

  it("fades items progressively with distance from the active item", () => {
    mockPathname("/debit-notes");

    const html = renderToStaticMarkup(createElement(DashboardSidebar));

    // Active is index 2 of 5: opacities must read 50/75/100/75/50 in order.
    const opacities = [...html.matchAll(/(?<=[\s"'])opacity-(100|75|50|40)/g)].map((match) => match[0]);
    expect(opacities).toEqual([
      "opacity-50",
      "opacity-75",
      "opacity-100",
      "opacity-75",
      "opacity-50",
    ]);
  });

  it("keeps a single-item category fully visible and balanced", () => {
    mockPathname("/organization");

    const html = renderToStaticMarkup(createElement(DashboardSidebar));

    expect(html).toContain("opacity-100");
    expect(html).not.toContain("opacity-75");
    expect(html).not.toContain("opacity-50");
    expect(html).not.toContain("opacity-40");
    expect(html).toContain("m-auto");
  });

  it("renders category title and signature font description in the sidebar footer without duplicate headers", () => {
    mockPathname("/invoices");

    const html = renderToStaticMarkup(createElement(DashboardSidebar));

    expect(html).not.toContain("<header");
    expect(html).toContain("<footer");
    expect(html).toContain("text-center");
    expect(html).toContain("Billing");
    expect(html).toContain("text-text-primary");
    expect(html).toContain("font-signature");
    expect(html).toContain("text-text-muted");
    expect(html).toContain("Invoicing, adjustments &amp; payment tracking");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<h2");
    expect(html).toContain("<nav");
    expect(html).toContain("<ul");
    // Planned entries never render as working links.
    expect(html).not.toContain("Estimates");
    expect(html).not.toContain("Planned");
  });

  it("renders nothing instead of a false active state for unknown routes", () => {
    mockPathname("/no-such-route");

    const html = renderToStaticMarkup(createElement(DashboardSidebar));

    expect(html).toBe("");
  });

  it("keeps every item keyboard-focusable with visible focus and hover states", () => {
    mockPathname("/payments");

    const html = renderToStaticMarkup(createElement(DashboardSidebar));

    expect(html).toContain("focus-visible:outline");
    expect(html).toContain("hover:opacity-100");
    expect(html).toContain("focus-visible:opacity-100");
    expect(html).toContain('aria-label="Billing navigation"');
  });

  describe("complete category coverage", () => {
    it("renders Dashboard category correctly on /dashboard", () => {
      mockPathname("/dashboard");

      const html = renderToStaticMarkup(createElement(DashboardSidebar));

      expect(html).toContain('aria-label="Dashboard navigation"');
      expect(html).toContain('href="/dashboard"');
      expect(html).toContain("Dashboard");
      expect(html).toContain('aria-current="page"');
      expect(html).toContain("text-primary-light");
      expect(html).toContain("text-text-primary");
      expect(html).not.toContain("bg-surface-alt");
      expect(html).not.toContain("Analytics");
    });

    it("renders Products & Services category correctly on /products", () => {
      mockPathname("/products");

      const html = renderToStaticMarkup(createElement(DashboardSidebar));

      expect(html).toContain('aria-label="Products &amp; Services navigation"');
      expect(html).toContain('href="/products"');
      expect(html).toContain('href="/services"');
      expect(html).toContain('href="/categories"');
      expect(html).toContain('href="/units"');
      expect(html).toContain('href="/pricing"');
      expect(html).toContain('href="/hsn-sac"');
      expect(html).toContain("Products");
      expect(html).toContain("Services");
      expect(html).toContain("Categories");

      // Products is active (index 0), Services is neighbor (index 1), followed by categories (dist 2), units (dist 3), pricing (dist 4), hsn-sac (dist 5)
      const opacities = [...html.matchAll(/(?<=[\s"'])opacity-(100|75|50|40)/g)].map((m) => m[0]);
      expect(opacities).toEqual([
        "opacity-100",
        "opacity-75",
        "opacity-50",
        "opacity-40",
        "opacity-40",
        "opacity-40",
      ]);
    });

    it("renders Products & Services category with Services active on /services/new", () => {
      mockPathname("/services/new");

      const html = renderToStaticMarkup(createElement(DashboardSidebar));

      expect(html).toContain('aria-label="Products &amp; Services navigation"');
      expect(html).toContain('href="/services"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain("text-primary-light");
      expect(html).toContain("text-text-primary");

      // Services is active (index 1), Products is neighbor (index 0), Categories is neighbor (index 2)
      const opacities = [...html.matchAll(/(?<=[\s"'])opacity-(100|75|50|40)/g)].map((m) => m[0]);
      expect(opacities).toEqual([
        "opacity-75",
        "opacity-100",
        "opacity-75",
        "opacity-50",
        "opacity-40",
        "opacity-40",
      ]);
    });

    it("renders Organization & Team category correctly on /organization", () => {
      mockPathname("/organization");

      const html = renderToStaticMarkup(createElement(DashboardSidebar));

      expect(html).toContain('aria-label="Organization &amp; Team navigation"');
      expect(html).toContain('href="/organization"');
      expect(html).toContain("Organization overview");
      expect(html).toContain('aria-current="page"');
      expect(html).toContain("text-primary-light");
      expect(html).toContain("text-text-primary");
      expect(html).not.toContain("Members");
    });

    it("renders Settings & Integrations category correctly on /settings/billing", () => {
      mockPathname("/settings/billing");

      const html = renderToStaticMarkup(createElement(DashboardSidebar));

      expect(html).toContain('aria-label="Settings &amp; Integrations navigation"');
      expect(html).toContain('href="/settings/billing"');
      expect(html).toContain("Billing settings");
      expect(html).toContain('aria-current="page"');
      expect(html).toContain("text-primary-light");
      expect(html).toContain("text-text-primary");
      expect(html).not.toContain("Tax settings");
    });
  });

  describe("category switching and route state fidelity", () => {
    it("switches categories cleanly with no residual or stale items", () => {
      // 1. Visit Billing
      mockPathname("/invoices");
      const billingHtml = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(billingHtml).toContain("Invoices");
      expect(billingHtml).toContain("Recurring invoices");
      expect(billingHtml).not.toContain("Customers");
      expect(billingHtml).not.toContain("Products");

      // 2. Switch to Sales
      mockPathname("/customers");
      const salesHtml = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(salesHtml).toContain("Customers");
      expect(salesHtml).not.toContain("Invoices");
      expect(salesHtml).not.toContain("Recurring invoices");
      expect(salesHtml).not.toContain("Products");

      // 3. Switch to Products & Services
      mockPathname("/products");
      const prodHtml = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(prodHtml).toContain("Products");
      expect(prodHtml).toContain("Services");
      expect(prodHtml).not.toContain("Customers");
      expect(prodHtml).not.toContain("Invoices");

      // 4. Switch to Settings
      mockPathname("/settings/billing");
      const settingsHtml = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(settingsHtml).toContain("Billing settings");
      expect(settingsHtml).not.toContain("Products");
      expect(settingsHtml).not.toContain("Customers");

      // 5. Switch back to Billing on a different item
      mockPathname("/recurring-invoices");
      const recurringHtml = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(recurringHtml).toContain("Recurring invoices");
      expect(recurringHtml).toContain('href="/recurring-invoices"');
      expect(recurringHtml).toContain('aria-current="page"');
      expect(recurringHtml).not.toContain("Billing settings");
    });

    it("accurately reflects browser back/forward history navigation", () => {
      // Simulate navigation history: /invoices -> /customers -> back to /invoices
      mockPathname("/invoices");
      const step1 = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(step1).toContain("Invoices");
      expect(step1).not.toContain("Customers");

      mockPathname("/customers");
      const step2 = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(step2).toContain("Customers");
      expect(step2).not.toContain("Invoices");

      // Browser Back
      mockPathname("/invoices");
      const step3 = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(step3).toContain("Invoices");
      expect(step3).not.toContain("Customers");

      // Browser Forward
      mockPathname("/customers");
      const step4 = renderToStaticMarkup(createElement(DashboardSidebar));
      expect(step4).toContain("Customers");
      expect(step4).not.toContain("Invoices");
    });

    it("resolves nested creation, detail, and edit routes across all features", () => {
      const nestedCases = [
        { path: "/invoices/new", expectedLabel: "Invoices", expectedCategory: "Billing navigation" },
        { path: "/invoices/inv-001", expectedLabel: "Invoices", expectedCategory: "Billing navigation" },
        { path: "/credit-notes/new", expectedLabel: "Credit notes", expectedCategory: "Billing navigation" },
        { path: "/credit-notes/cn-001", expectedLabel: "Credit notes", expectedCategory: "Billing navigation" },
        { path: "/debit-notes/new", expectedLabel: "Debit notes", expectedCategory: "Billing navigation" },
        { path: "/debit-notes/dn-001", expectedLabel: "Debit notes", expectedCategory: "Billing navigation" },
        { path: "/payments/new", expectedLabel: "Payments received", expectedCategory: "Billing navigation" },
        { path: "/payments/pay-001", expectedLabel: "Payments received", expectedCategory: "Billing navigation" },
        { path: "/recurring-invoices/new", expectedLabel: "Recurring invoices", expectedCategory: "Billing navigation" },
        { path: "/recurring-invoices/rec-001", expectedLabel: "Recurring invoices", expectedCategory: "Billing navigation" },
        { path: "/customers/new", expectedLabel: "Customers", expectedCategory: "Sales navigation" },
        { path: "/customers/cust-001", expectedLabel: "Customers", expectedCategory: "Sales navigation" },
        { path: "/customers/cust-001/edit", expectedLabel: "Customers", expectedCategory: "Sales navigation" },
        { path: "/products/new", expectedLabel: "Products", expectedCategory: "Products &amp; Services navigation" },
        { path: "/products/p-001/edit", expectedLabel: "Products", expectedCategory: "Products &amp; Services navigation" },
        { path: "/services/new", expectedLabel: "Services", expectedCategory: "Products &amp; Services navigation" },
        { path: "/services/s-001/edit", expectedLabel: "Services", expectedCategory: "Products &amp; Services navigation" },
      ];

      for (const { path, expectedLabel, expectedCategory } of nestedCases) {
        mockPathname(path);
        const html = renderToStaticMarkup(createElement(DashboardSidebar));
        expect(html).toContain(`aria-label="${expectedCategory}"`);
        expect(html).toContain(expectedLabel);
        expect(html).toContain('aria-current="page"');
        expect(html).toContain("text-primary-light");
        expect(html).toContain("text-text-primary");
        expect(html).not.toContain("bg-surface-alt");
        expect(html).not.toContain("hover:bg-");
      }
    });

    it("calculates progressive opacity at extreme ends of a 5-item menu", () => {
      // First item active (index 0)
      mockPathname("/invoices");
      const firstHtml = renderToStaticMarkup(createElement(DashboardSidebar));
      const firstOpacities = [...firstHtml.matchAll(/(?<=[\s"'])opacity-(100|75|50|40)/g)].map((m) => m[0]);
      expect(firstOpacities).toEqual([
        "opacity-100",
        "opacity-75",
        "opacity-50",
        "opacity-40",
        "opacity-40",
      ]);

      // Last item active (index 4)
      mockPathname("/recurring-invoices");
      const lastHtml = renderToStaticMarkup(createElement(DashboardSidebar));
      const lastOpacities = [...lastHtml.matchAll(/(?<=[\s"'])opacity-(100|75|50|40)/g)].map((m) => m[0]);
      expect(lastOpacities).toEqual([
        "opacity-40",
        "opacity-40",
        "opacity-50",
        "opacity-75",
        "opacity-100",
      ]);
    });
  });

  describe("layout and responsive contract", () => {
    it("satisfies the layout rules: sticky, viewport-bounded, scrollable, vertically centered", () => {
      mockPathname("/invoices");
      const html = renderToStaticMarkup(createElement(DashboardSidebar));

      // Aside container
      expect(html).toContain("sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 md:flex md:flex-col");
      // Nav scroll container
      expect(html).toContain("flex flex-1 flex-col overflow-y-auto px-3 py-4");
      // Vertically centered ul
      expect(html).toContain("m-auto flex w-full flex-col gap-1");
      // Footer with category title
      expect(html).toContain("<footer");
      expect(html).toContain("Billing");
      expect(html).toContain("font-signature");
      // Truncation preventing horizontal overflow
      expect(html).toContain("truncate");
      // Motion reduction
      expect(html).toContain("motion-reduce:transition-none");
    });
  });
});
