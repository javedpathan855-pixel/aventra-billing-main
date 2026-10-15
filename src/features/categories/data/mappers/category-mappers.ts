import type { Category } from "../../domain/entities/category";
import type { CategoryDto } from "../dto/category-dto";

export const toCategoryDto = (c: Category): CategoryDto => ({
  id: c.id,
  organizationId: c.organizationId,
  name: c.name,
  description: c.description ?? null,
  status: c.status,
  createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
  updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
});
