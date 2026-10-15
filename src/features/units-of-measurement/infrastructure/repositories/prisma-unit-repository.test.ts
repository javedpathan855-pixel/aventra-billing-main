import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaUnitRepository } from "./prisma-unit-repository";
import { UnitDuplicateError, UnitNotFoundError } from "../../domain/errors/unit-errors";

const { findFirstMock, findManyMock, countMock, createMock, updateMock, deleteMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
  countMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    unitOfMeasurement: {
      findFirst: findFirstMock,
      findMany: findManyMock,
      count: countMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
  }),
}));

const row = {
  id: "uom_1",
  organizationId: "org_1",
  name: "Pieces",
  code: "PCS",
  description: null,
  precision: 3,
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("PrismaUnitRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes reads by organization and matches codes case-insensitively", async () => {
    const repo = new PrismaUnitRepository();
    findFirstMock.mockResolvedValue(row);

    await repo.findByCode("org_1", "pcs");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        code: { equals: "PCS", mode: "insensitive" },
      },
    });
  });

  it("rejects duplicate codes on create", async () => {
    const repo = new PrismaUnitRepository();
    findFirstMock.mockResolvedValue(row);

    await expect(
      repo.create({
        id: "uom_2",
        organizationId: "org_1",
        name: "Pieces",
        code: "PCS",
        description: null,
        precision: 3,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(UnitDuplicateError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("throws not-found when updating a missing record", async () => {
    const repo = new PrismaUnitRepository();
    findFirstMock.mockResolvedValue(null);

    await expect(repo.update("org_1", "missing", { status: "INACTIVE" })).rejects.toBeInstanceOf(
      UnitNotFoundError,
    );
  });
});
