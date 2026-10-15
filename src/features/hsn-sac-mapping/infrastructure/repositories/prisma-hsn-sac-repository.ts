import "server-only";

import { getPrisma } from "@/shared/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { HsnSacType } from "../../domain/entities/hsn-sac-code";
import { hsnSacRecordId } from "../../domain/entities/hsn-sac-code";
import type {
  HsnSacImportStatus,
  HsnSacUpsertRecord,
  IHsnSacRepository,
  HsnSacListResult,
} from "../../domain/repositories/hsn-sac-repository";
import type { HsnSacListFilter } from "../../domain/entities/hsn-sac-code";
import { toDomainHsnSacCode } from "../mappers/prisma-hsn-sac-mapper";

export class PrismaHsnSacRepository implements IHsnSacRepository {
  async findByCode(type: HsnSacType, code: string) {
    const prisma = getPrisma();
    const row = await prisma.hsnSacCode.findUnique({
      where: { type_code: { type, code } },
    });
    return row ? toDomainHsnSacCode(row) : null;
  }

  async list(filter?: HsnSacListFilter): Promise<HsnSacListResult> {
    const prisma = getPrisma();
    const where: Prisma.HsnSacCodeWhereInput = {};

    if (filter?.type && filter.type !== "ALL") {
      where.type = filter.type;
    }

    if (filter?.query && filter.query.trim().length > 0) {
      const q = filter.query.trim();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      prisma.hsnSacCode.findMany({
        where,
        orderBy: { code: "asc" },
        skip: filter?.offset ?? 0,
        take: filter?.limit ?? 20,
      }),
      prisma.hsnSacCode.count({ where }),
    ]);

    return { codes: rows.map(toDomainHsnSacCode), totalCount };
  }

  async countByType(type: HsnSacType): Promise<number> {
    const prisma = getPrisma();
    return prisma.hsnSacCode.count({ where: { type } });
  }

  async getImportStatus(): Promise<HsnSacImportStatus> {
    const prisma = getPrisma();
    const [hsnCount, sacCount, latest] = await Promise.all([
      prisma.hsnSacCode.count({ where: { type: "HSN" } }),
      prisma.hsnSacCode.count({ where: { type: "SAC" } }),
      prisma.hsnSacCode.findFirst({
        orderBy: { importedAt: "desc" },
        select: { sourceFile: true, importedAt: true },
      }),
    ]);

    return {
      hsnCount,
      sacCount,
      sourceFile: latest?.sourceFile ?? null,
      lastImportedAt: latest ? latest.importedAt.toISOString() : null,
    };
  }

  async upsert(record: HsnSacUpsertRecord) {
    const prisma = getPrisma();
    const row = await prisma.hsnSacCode.upsert({
      where: { type_code: { type: record.type, code: record.code } },
      create: {
        id: hsnSacRecordId(record.type, record.code),
        type: record.type,
        code: record.code,
        description: record.description,
        isActive: true,
        sourceFile: record.sourceFile ?? null,
        sourceSheet: record.sourceSheet ?? null,
        importedAt: new Date(),
      },
      update: {
        description: record.description,
        sourceFile: record.sourceFile ?? null,
        sourceSheet: record.sourceSheet ?? null,
        importedAt: new Date(),
      },
    });
    return toDomainHsnSacCode(row);
  }
}

export const hsnSacRepository = new PrismaHsnSacRepository();
