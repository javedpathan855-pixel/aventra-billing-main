import type { Category as PrismaCategory } from "@/generated/prisma/client";
import type { Category, CategoryStatus } from "../../domain/entities/category";

export const toDomainCategory = (row: PrismaCategory): Category => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  description: row.description,
  status: row.status as CategoryStatus,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
