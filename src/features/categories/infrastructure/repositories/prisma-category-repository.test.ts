import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaCategoryRepository } from "./prisma-category-repository";
import {
  CategoryDuplicateError,
  CategoryNotFoundError,
} from "../../domain/errors/category-errors";

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
    category: {
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
  id: "cat_1",
  organizationId: "org_1",
  name: "Hardware",
  description: null,
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("PrismaCategoryRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes reads by organization", async () => {
    const repo = new PrismaCategoryRepository();
    findFirstMock.mockResolvedValue(row);

    await repo.findById("org_1", "cat_1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "cat_1", organizationId: "org_1" },
    });
  });

  it("matches names case-insensitively", async () => {
    const repo = new PrismaCategoryRepository();
    findFirstMock.mockResolvedValue(row);

    await repo.findByName("org_1", "  hardware ");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        name: { equals: "hardware", mode: "insensitive" },
      },
    });
  });

  it("rejects duplicate names on create", async () => {
    const repo = new PrismaCategoryRepository();
    findFirstMock.mockResolvedValue(row);

    await expect(
      repo.create({
        id: "cat_2",
        organizationId: "org_1",
        name: "Hardware",
        description: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(CategoryDuplicateError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("maps unique violations to duplicate errors", async () => {
    const repo = new PrismaCategoryRepository();
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValue({ code: "P2002" });

    await expect(
      repo.create({
        id: "cat_2",
        organizationId: "org_1",
        name: "Hardware",
        description: null,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(CategoryDuplicateError);
  });

  it("throws not-found when updating a missing record", async () => {
    const repo = new PrismaCategoryRepository();
    findFirstMock.mockResolvedValue(null);

    await expect(repo.update("org_1", "missing", { status: "INACTIVE" })).rejects.toBeInstanceOf(
      CategoryNotFoundError,
    );
  });
});
