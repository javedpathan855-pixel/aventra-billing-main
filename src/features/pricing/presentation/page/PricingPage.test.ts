import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PricingPage } from "./PricingPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/pricing",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../data/mutations/update-prices", () => ({
  updateProductPricesAction: vi.fn(),
}));

const entry = {
  productId: "prod_1",
  name: "Scanner",
  type: "PRODUCT" as const,
  status: "ACTIVE" as const,
  category: "Hardware",
  unit: "PCS",
  sellingPrice: 100,
  purchasePrice: 60,
  currency: "INR (₹)",
  taxRate: 18,
  updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

describe("PricingPage", () => {
  it("renders prices, margins, and the empty state", () => {
    const populated = renderToStaticMarkup(
      createElement(PricingPage, {
        initialEntries: [entry],
        categoryOptions: ["Hardware"],
      }),
    );
    expect(populated).toContain("Scanner");
    expect(populated).toContain("40%");

    const empty = renderToStaticMarkup(createElement(PricingPage, {}));
    expect(empty).toContain("No priced items yet");
  });
});
