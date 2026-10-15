"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveCategoryContext } from "../context/category-context";
import { categoryRepository } from "../../infrastructure/repositories/prisma-category-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import {
  CategoryInUseError,
  CategoryNotFoundError,
  ForbiddenCategoryActionError,
} from "../../domain/errors/category-errors";
import type { CategoryActionResult } from "../dto/category-dto";

export const deleteCategoryAction = async (
  id: string,
): Promise<CategoryActionResult<void>> => {
  try {
    const { organizationId, memberRole } = await resolveCategoryContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new ForbiddenCategoryActionError("Only organization admins can delete categories.");
    }

    const existing = await categoryRepository.findById(organizationId, id);
    if (!existing) {
      throw new CategoryNotFoundError(id);
    }

    const usage = await productRepository.list(organizationId, {
      category: existing.name,
      limit: 1,
      offset: 0,
    });
    if (usage.totalCount > 0) {
      throw new CategoryInUseError(existing.name, usage.totalCount);
    }

    await categoryRepository.delete(organizationId, id);

    revalidatePath("/categories");
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
