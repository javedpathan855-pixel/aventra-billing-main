import { describe, expect, it } from "vitest";
import { toDomainUnit } from "./prisma-unit-mapper";

describe("toDomainUnit", () => {
  it("maps a prisma row to the unit domain entity", () => {
    const row = {
      id: "uom_1",
      organizationId: "org_1",
      name: "Pieces",
      code: "PCS",
      description: null,
      precision: 3,
      status: "ACTIVE" as const,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    expect(toDomainUnit(row)).toEqual(row);
  });
});
