"use server";

import { revalidatePath } from "next/cache";
import { resolveCategoryContext } from "../context/category-context";
import { categoryRepository } from "../../infrastructure/repositories/prisma-category-repository";
import { DEFAULT_CATEGORIES } from "../../domain/rules/category-rules";
import type { CategoryActionResult } from "../dto/category-dto";

export type SeedCategoriesResult = {
  created: number;
  skipped: number;
};

/**
 * Seeds the standard catalogue categories for organizations adopting the
 * master. Additive only: existing records (matched case-insensitively) are
 * never modified, so re-running is safe.
 */
export const seedDefaultCategoriesAction = async (): Promise<
  CategoryActionResult<SeedCategoriesResult>
> => {
  try {
    const { organizationId } = await resolveCategoryContext();

    let created = 0;
    let skipped = 0;
    for (const def of DEFAULT_CATEGORIES) {
      const existing = await categoryRepository.findByName(organizationId, def.name);
      if (existing) {
        skipped += 1;
        continue;
      }
      await categoryRepository.create({
        id: `cat_${crypto.randomUUID()}`,
        organizationId,
        name: def.name,
        description: def.description,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      created += 1;
    }

    revalidatePath("/categories");
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true, data: { created, skipped } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
