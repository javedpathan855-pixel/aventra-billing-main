import type { HsnSacCode as PrismaHsnSacCode } from "@/generated/prisma/client";
import type { HsnSacCode, HsnSacType } from "../../domain/entities/hsn-sac-code";

export const toDomainHsnSacCode = (row: PrismaHsnSacCode): HsnSacCode => ({
  id: row.id,
  type: row.type as HsnSacType,
  code: row.code,
  description: row.description,
  isActive: row.isActive,
  sourceFile: row.sourceFile,
  sourceSheet: row.sourceSheet,
  importedAt: row.importedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
