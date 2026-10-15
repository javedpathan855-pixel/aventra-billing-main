import "server-only";

import { resolveCategoryContext } from "../context/category-context";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";

/**
 * Counts catalogue items using a category name. Used for usage display and
 * delete protection. Reads through the products feature's repository contract
 * (established cross-feature server pattern), never through presentation.
 */
export const countCategoryUsage = async (categoryName: string): Promise<number> => {
  const { organizationId } = await resolveCategoryContext();
  const result = await productRepository.list(organizationId, {
    category: categoryName,
    limit: 1,
    offset: 0,
  });
  return result.totalCount;
};

export const countCategoriesUsage = async (
  categoryNames: string[],
): Promise<Record<string, number>> => {
  const entries = await Promise.all(
    categoryNames.map(async (name) => [name, await countCategoryUsage(name)] as const),
  );
  return Object.fromEntries(entries);
};
