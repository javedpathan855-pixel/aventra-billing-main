import "server-only";

import { resolveCategoryContext } from "../context/category-context";
import { categoryRepository } from "../../infrastructure/repositories/prisma-category-repository";
import { toCategoryDto } from "../mappers/category-mappers";
import type { CategoryDto, CategoryFilterInput } from "../dto/category-dto";

export type GetCategoriesResult = {
  categories: CategoryDto[];
  totalCount: number;
};

export const getCategories = async (
  filter?: CategoryFilterInput,
): Promise<GetCategoriesResult> => {
  const { organizationId } = await resolveCategoryContext();

  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 10;

  const result = await categoryRepository.list(organizationId, {
    status: filter?.status,
    query: filter?.query,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    categories: result.categories.map(toCategoryDto),
    totalCount: result.totalCount,
  };
};
