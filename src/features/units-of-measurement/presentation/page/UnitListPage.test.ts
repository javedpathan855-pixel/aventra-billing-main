import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UnitListPage } from "./UnitListPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/units",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("../../data/mutations/seed-default-units", () => ({
  seedDefaultUnitsAction: vi.fn(),
}));

const unit = {
  id: "uom_1",
  organizationId: "org_1",
  name: "Pieces",
  code: "PCS",
  description: "Counts",
  precision: 3,
  status: "ACTIVE" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
};

describe("UnitListPage", () => {
  it("renders populated and empty states", () => {
    const populated = renderToStaticMarkup(
      createElement(UnitListPage, {
        initialUnits: [unit],
        totalCount: 1,
        usageCounts: { PCS: 7 },
      }),
    );
    expect(populated).toContain("PCS");
    expect(populated).toContain("Seed standards");

    const empty = renderToStaticMarkup(createElement(UnitListPage, {}));
    expect(empty).toContain("No units yet");
  });
});
