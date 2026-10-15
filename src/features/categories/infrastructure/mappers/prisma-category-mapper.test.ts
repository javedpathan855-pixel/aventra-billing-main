import { describe, expect, it } from "vitest";
import { toDomainCategory } from "./prisma-category-mapper";

describe("toDomainCategory", () => {
  it("maps a prisma row to the category domain entity", () => {
    const row = {
      id: "cat_1",
      organizationId: "org_1",
      name: "Hardware",
      description: "Devices",
      status: "ACTIVE" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };

    expect(toDomainCategory(row)).toEqual(row);
  });
});
