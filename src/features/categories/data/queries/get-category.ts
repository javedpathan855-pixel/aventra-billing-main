import "server-only";

import { resolveCategoryContext } from "../context/category-context";
import { categoryRepository } from "../../infrastructure/repositories/prisma-category-repository";
import { toCategoryDto } from "../mappers/category-mappers";
import type { CategoryDto } from "../dto/category-dto";

export const getCategoryById = async (id: string): Promise<CategoryDto | null> => {
  const { organizationId } = await resolveCategoryContext();
  const found = await categoryRepository.findById(organizationId, id);
  return found ? toCategoryDto(found) : null;
};
