import "server-only";

import { resolveCategoryContext } from "../context/category-context";
import { categoryRepository } from "../../infrastructure/repositories/prisma-category-repository";

/**
 * Active category names for catalogue dropdowns, alphabetically sorted.
 * Product forms consume this through approved server components — never
 * hardcode category options in presentation.
 */
export const getCategoryOptions = async (): Promise<string[]> => {
  const { organizationId } = await resolveCategoryContext();
  const result = await categoryRepository.list(organizationId, {
    status: "ACTIVE",
    limit: 200,
    offset: 0,
  });
  return result.categories.map((c) => c.name);
};
