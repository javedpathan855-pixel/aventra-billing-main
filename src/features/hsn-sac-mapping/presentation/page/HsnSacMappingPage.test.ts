import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HsnSacMappingPage } from "./HsnSacMappingPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/hsn-sac",
  useSearchParams: () => new URLSearchParams(),
}));

describe("HsnSacMappingPage", () => {
  it("renders import status, mappings, and search results", () => {
    const html = renderToStaticMarkup(
      createElement(HsnSacMappingPage, {
        initialCodes: [
          {
            id: "HSN:01",
            type: "HSN",
            code: "01",
            description: "LIVE ANIMALS",
            isActive: true,
            sourceFile: "HSN_SAC.xlsx",
            sourceSheet: "HSN_MSTR",
            importedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          },
        ],
        totalCount: 1,
        importStatus: {
          hsnCount: 21932,
          sacCount: 681,
          sourceFile: "HSN_SAC.xlsx",
          lastImportedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
        },
        mapped: [{ code: "01", type: "HSN", description: "LIVE ANIMALS", itemCount: 2 }],
      }),
    );
    expect(html).toContain("21932");
    expect(html).toContain("LIVE ANIMALS");
    expect(html).toContain("HSN_SAC.xlsx");
  });

  it("renders the not-imported empty state", () => {
    const html = renderToStaticMarkup(createElement(HsnSacMappingPage, {}));
    expect(html).toContain("No classification data yet");
    expect(html).toContain("No mappings yet");
  });
});
