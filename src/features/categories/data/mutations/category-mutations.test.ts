import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { resolveCategoryContextMock, categoryRepositoryMock, productRepositoryMock, isAdminMock } = vi.hoisted(
  () => ({
    resolveCategoryContextMock: vi.fn(),
    categoryRepositoryMock: {
      findById: vi.fn(),
      findByName: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    productRepositoryMock: { list: vi.fn() },
    isAdminMock: vi.fn(),
  }),
);

vi.mock("../context/category-context", () => ({
  resolveCategoryContext: resolveCategoryContextMock,
}));

vi.mock("../../infrastructure/repositories/prisma-category-repository", () => ({
  categoryRepository: categoryRepositoryMock,
}));

vi.mock("@/features/products/infrastructure/repositories/prisma-product-repository", () => ({
  productRepository: productRepositoryMock,
}));

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (...args: unknown[]) => isAdminMock(...args),
}));

import { createCategoryAction } from "./create-category";
import { updateCategoryAction } from "./update-category";
import { deleteCategoryAction } from "./delete-category";
import { seedDefaultCategoriesAction } from "./seed-default-categories";

describe("category mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCategoryContextMock.mockResolvedValue({
      organizationId: "org_1",
      userId: "user_1",
      memberRole: "owner",
    });
    isAdminMock.mockReturnValue(true);
  });

  it("creates a category with a normalized name", async () => {
    categoryRepositoryMock.findByName.mockResolvedValue(null);
    categoryRepositoryMock.create.mockImplementation(async (c: unknown) => c);

    const result = await createCategoryAction({ name: "  Office   Supplies ", description: null });

    expect(result.success).toBe(true);
    expect(categoryRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org_1", name: "Office Supplies" }),
    );
  });

  it("rejects duplicate names", async () => {
    categoryRepositoryMock.findByName.mockResolvedValue({ id: "cat_1", name: "Hardware" });

    const result = await createCategoryAction({ name: "hardware", description: null });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(categoryRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("rejects short names with field errors", async () => {
    const result = await createCategoryAction({ name: "A", description: null });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it("blocks deletion of categories used by catalogue items", async () => {
    categoryRepositoryMock.findById.mockResolvedValue({ id: "cat_1", name: "Hardware" });
    productRepositoryMock.list.mockResolvedValue({ products: [], totalCount: 3 });

    const result = await deleteCategoryAction("cat_1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("used by 3");
    expect(categoryRepositoryMock.delete).not.toHaveBeenCalled();
  });

  it("requires admin role for deletion", async () => {
    isAdminMock.mockReturnValue(false);

    const result = await deleteCategoryAction("cat_1");

    expect(result.success).toBe(false);
    expect(categoryRepositoryMock.delete).not.toHaveBeenCalled();
  });

  it("seeds missing standards without touching existing records", async () => {
    categoryRepositoryMock.findByName.mockImplementation(async (_org: string, name: string) =>
      name === "General" ? { id: "cat_g", name: "General" } : null,
    );
    categoryRepositoryMock.create.mockImplementation(async (c: unknown) => c);

    const result = await seedDefaultCategoriesAction();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ created: 7, skipped: 1 });
    expect(categoryRepositoryMock.create).toHaveBeenCalledTimes(7);
  });

  it("rejects renaming to an existing category name", async () => {
    categoryRepositoryMock.findById.mockResolvedValue({ id: "cat_1", name: "Hardware" });
    categoryRepositoryMock.findByName.mockResolvedValue({ id: "cat_2", name: "Software" });

    const result = await updateCategoryAction("cat_1", { name: "Software" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });
});
