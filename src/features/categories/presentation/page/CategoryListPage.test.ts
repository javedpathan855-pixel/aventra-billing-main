import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CategoryListPage } from "./CategoryListPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/categories",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../data/mutations/seed-default-categories", () => ({
  seedDefaultCategoriesAction: vi.fn(),
}));

const category = {
  id: "cat_1",
  organizationId: "org_1",
  name: "Hardware",
  description: "Devices",
  status: "ACTIVE" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

describe("CategoryListPage", () => {
  it("renders populated, empty, and usage states", () => {
    const populated = renderToStaticMarkup(
      createElement(CategoryListPage, {
        initialCategories: [category],
        totalCount: 1,
        usageCounts: { Hardware: 4 },
      }),
    );
    expect(populated).toContain("Hardware");
    expect(populated).toContain("Seed standards");

    const empty = renderToStaticMarkup(createElement(CategoryListPage, {}));
    expect(empty).toContain("No categories yet");
  });
});
