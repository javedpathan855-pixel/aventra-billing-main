import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { resolveUnitContextMock, unitRepositoryMock, productRepositoryMock, isAdminMock } = vi.hoisted(
  () => ({
    resolveUnitContextMock: vi.fn(),
    unitRepositoryMock: {
      findById: vi.fn(),
      findByCode: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productRepositoryMock: { list: vi.fn() },
    isAdminMock: vi.fn(),
  }),
);

vi.mock("../context/unit-context", () => ({
  resolveUnitContext: resolveUnitContextMock,
}));

vi.mock("../../infrastructure/repositories/prisma-unit-repository", () => ({
  unitRepository: unitRepositoryMock,
}));

vi.mock("@/features/products/infrastructure/repositories/prisma-product-repository", () => ({
  productRepository: productRepositoryMock,
}));

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (...args: unknown[]) => isAdminMock(...args),
}));

import { createUnitAction } from "./create-unit";
import { updateUnitAction } from "./update-unit";
import { deleteUnitAction } from "./delete-unit";
import { seedDefaultUnitsAction } from "./seed-default-units";
import { assertLineUnitsValid } from "../queries/assert-line-units";

describe("unit mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveUnitContextMock.mockResolvedValue({
      organizationId: "org_1",
      userId: "user_1",
      memberRole: "owner",
    });
    isAdminMock.mockReturnValue(true);
  });

  it("creates a unit with a normalized code", async () => {
    unitRepositoryMock.findByCode.mockResolvedValue(null);
    unitRepositoryMock.create.mockImplementation(async (u: unknown) => u);

    const result = await createUnitAction({ name: "Pieces", code: " pcs ", precision: 3 });

    expect(result.success).toBe(true);
    expect(unitRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org_1", code: "PCS", name: "Pieces" }),
    );
  });

  it("rejects invalid codes and precision", async () => {
    const badCode = await createUnitAction({ name: "Pieces", code: "P-C", precision: 3 });
    expect(badCode.success).toBe(false);

    const badPrecision = await createUnitAction({ name: "Pieces", code: "PCZ", precision: 9 });
    expect(badPrecision.success).toBe(false);
    expect(badPrecision.fieldErrors?.precision).toBeDefined();
  });

  it("updates unit attributes and validates uniqueness", async () => {
    unitRepositoryMock.findById.mockResolvedValue({
      id: "uom_1",
      name: "Pieces",
      code: "PCS",
      precision: 0,
      status: "ACTIVE",
    });
    unitRepositoryMock.update.mockResolvedValue({
      id: "uom_1",
      name: "Pieces Custom",
      code: "PCS",
      precision: 0,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await updateUnitAction("uom_1", { name: "Pieces Custom" });
    expect(res.success).toBe(true);
    expect(unitRepositoryMock.update).toHaveBeenCalledWith(
      "org_1",
      "uom_1",
      expect.objectContaining({ name: "Pieces Custom" }),
    );
  });

  it("blocks deletion of units used by catalogue items", async () => {
    unitRepositoryMock.findById.mockResolvedValue({ id: "uom_1", code: "PCS" });
    productRepositoryMock.list.mockResolvedValue({ products: [], totalCount: 2 });

    const result = await deleteUnitAction("uom_1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("used by 2");
    expect(unitRepositoryMock.delete).not.toHaveBeenCalled();
  });

  it("seeds missing standards without touching existing records", async () => {
    unitRepositoryMock.findByCode.mockImplementation(async (_org: string, code: string) =>
      code === "PCS" ? { id: "uom_pcs", code: "PCS" } : null,
    );
    unitRepositoryMock.create.mockImplementation(async (u: unknown) => u);

    const result = await seedDefaultUnitsAction();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ created: 10, skipped: 1 });
  });
});

describe("assertLineUnitsValid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips validation when no lines carry a unit", async () => {
    await assertLineUnitsValid("org_1", [{ quantity: 2 }]);
    expect(unitRepositoryMock.list).not.toHaveBeenCalled();
  });

  it("accepts any unit within scale when the master is empty", async () => {
    unitRepositoryMock.list.mockResolvedValue({ units: [], totalCount: 0 });

    await assertLineUnitsValid("org_1", [{ unit: "PCS", quantity: 1.5 }]);
    expect(unitRepositoryMock.findByCode).not.toHaveBeenCalled();
  });

  it("rejects unknown, inactive, and over-precise units once adopted", async () => {
    unitRepositoryMock.list.mockResolvedValue({ units: [{ code: "PCS" }], totalCount: 1 });
    unitRepositoryMock.findByCode.mockImplementation(async (_org: string, code: string) => {
      if (code === "PCS") return { id: "uom_1", code: "PCS", status: "ACTIVE", precision: 0 };
      if (code === "OLD") return { id: "uom_2", code: "OLD", status: "INACTIVE", precision: 3 };
      return null;
    });

    await expect(assertLineUnitsValid("org_1", [{ unit: "XYZ", quantity: 1 }])).rejects.toThrow(
      'unit "XYZ" is not a defined unit',
    );
    await expect(assertLineUnitsValid("org_1", [{ unit: "OLD", quantity: 1 }])).rejects.toThrow(
      'unit "OLD" is inactive',
    );
    await expect(assertLineUnitsValid("org_1", [{ unit: "PCS", quantity: 1.5 }])).rejects.toThrow(
      "exceeds the 0 decimal place(s)",
    );
    await assertLineUnitsValid("org_1", [{ unit: "PCS", quantity: 2 }]);
  });
});
