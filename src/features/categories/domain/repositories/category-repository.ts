import type { Category, CategoryListFilter } from "../entities/category";

export type { CategoryListFilter };

export type CategoryListResult = {
  categories: Category[];
  totalCount: number;
};

export type ICategoryRepository = {
  findById(organizationId: string, id: string): Promise<Category | null>;
  findByName(organizationId: string, name: string): Promise<Category | null>;
  list(organizationId: string, filter?: CategoryListFilter): Promise<CategoryListResult>;
  create(category: Category): Promise<Category>;
  update(organizationId: string, id: string, patch: Partial<Category>): Promise<Category>;
  delete(organizationId: string, id: string): Promise<void>;
};
