import "server-only";

import { getPrisma } from "@/shared/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Category } from "../../domain/entities/category";
import type {
  CategoryListFilter,
  CategoryListResult,
  ICategoryRepository,
} from "../../domain/repositories/category-repository";
import { toDomainCategory } from "../mappers/prisma-category-mapper";
import { CategoryDuplicateError, CategoryNotFoundError } from "../../domain/errors/category-errors";

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code?: string }).code === "P2002";

export class PrismaCategoryRepository implements ICategoryRepository {
  async findById(organizationId: string, id: string): Promise<Category | null> {
    const prisma = getPrisma();
    const row = await prisma.category.findFirst({
      where: { id, organizationId },
    });
    return row ? toDomainCategory(row) : null;
  }

  async findByName(organizationId: string, name: string): Promise<Category | null> {
    const prisma = getPrisma();
    const row = await prisma.category.findFirst({
      where: {
        organizationId,
        name: { equals: name.trim(), mode: "insensitive" },
      },
    });
    return row ? toDomainCategory(row) : null;
  }

  async list(organizationId: string, filter?: CategoryListFilter): Promise<CategoryListResult> {
    const prisma = getPrisma();
    const where: Prisma.CategoryWhereInput = { organizationId };

    if (filter?.status && filter.status !== "ALL") {
      where.status = filter.status;
    }

    if (filter?.query && filter.query.trim().length > 0) {
      const q = filter.query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { name: "asc" },
        skip: filter?.offset ?? 0,
        take: filter?.limit ?? 50,
      }),
      prisma.category.count({ where }),
    ]);

    return { categories: rows.map(toDomainCategory), totalCount };
  }

  async create(category: Category): Promise<Category> {
    const prisma = getPrisma();

    const existing = await this.findByName(category.organizationId, category.name);
    if (existing) {
      throw new CategoryDuplicateError(category.name);
    }

    try {
      const row = await prisma.category.create({
        data: {
          id: category.id,
          organizationId: category.organizationId,
          name: category.name,
          description: category.description ?? null,
          status: category.status,
        },
      });
      return toDomainCategory(row);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new CategoryDuplicateError(category.name);
      }
      throw err;
    }
  }

  async update(organizationId: string, id: string, patch: Partial<Category>): Promise<Category> {
    const prisma = getPrisma();

    const existing = await this.findById(organizationId, id);
    if (!existing) {
      throw new CategoryNotFoundError(id);
    }

    if (patch.name && patch.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.findByName(organizationId, patch.name);
      if (duplicate && duplicate.id !== id) {
        throw new CategoryDuplicateError(patch.name);
      }
    }

    try {
      const data: Prisma.CategoryUpdateInput = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.description !== undefined) data.description = patch.description;
      if (patch.status !== undefined) data.status = patch.status;

      const row = await prisma.category.update({
        where: { id },
        data,
      });
      return toDomainCategory(row);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new CategoryDuplicateError(patch.name ?? "");
      }
      throw err;
    }
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const prisma = getPrisma();
    const existing = await this.findById(organizationId, id);
    if (!existing) {
      throw new CategoryNotFoundError(id);
    }
    await prisma.category.delete({ where: { id } });
  }
}

export const categoryRepository = new PrismaCategoryRepository();
