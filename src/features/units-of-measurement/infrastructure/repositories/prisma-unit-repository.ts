import "server-only";

import { getPrisma } from "@/shared/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { UnitOfMeasurement } from "../../domain/entities/unit";
import type {
  IUnitRepository,
  UnitListFilter,
  UnitListResult,
} from "../../domain/repositories/unit-repository";
import { toDomainUnit } from "../mappers/prisma-unit-mapper";
import { UnitDuplicateError, UnitNotFoundError } from "../../domain/errors/unit-errors";

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code?: string }).code === "P2002";

export class PrismaUnitRepository implements IUnitRepository {
  async findById(organizationId: string, id: string): Promise<UnitOfMeasurement | null> {
    const prisma = getPrisma();
    const row = await prisma.unitOfMeasurement.findFirst({
      where: { id, organizationId },
    });
    return row ? toDomainUnit(row) : null;
  }

  async findByCode(organizationId: string, code: string): Promise<UnitOfMeasurement | null> {
    const prisma = getPrisma();
    const row = await prisma.unitOfMeasurement.findFirst({
      where: {
        organizationId,
        code: { equals: code.trim().toUpperCase(), mode: "insensitive" },
      },
    });
    return row ? toDomainUnit(row) : null;
  }

  async list(organizationId: string, filter?: UnitListFilter): Promise<UnitListResult> {
    const prisma = getPrisma();
    const where: Prisma.UnitOfMeasurementWhereInput = { organizationId };

    if (filter?.status && filter.status !== "ALL") {
      where.status = filter.status;
    }

    if (filter?.query && filter.query.trim().length > 0) {
      const q = filter.query.trim();
      where.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      prisma.unitOfMeasurement.findMany({
        where,
        orderBy: { code: "asc" },
        skip: filter?.offset ?? 0,
        take: filter?.limit ?? 50,
      }),
      prisma.unitOfMeasurement.count({ where }),
    ]);

    return { units: rows.map(toDomainUnit), totalCount };
  }

  async create(unit: UnitOfMeasurement): Promise<UnitOfMeasurement> {
    const prisma = getPrisma();

    const existing = await this.findByCode(unit.organizationId, unit.code);
    if (existing) {
      throw new UnitDuplicateError(unit.code);
    }

    try {
      const row = await prisma.unitOfMeasurement.create({
        data: {
          id: unit.id,
          organizationId: unit.organizationId,
          name: unit.name,
          code: unit.code,
          description: unit.description ?? null,
          precision: unit.precision,
          status: unit.status,
        },
      });
      return toDomainUnit(row);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new UnitDuplicateError(unit.code);
      }
      throw err;
    }
  }

  async update(
    organizationId: string,
    id: string,
    patch: Partial<UnitOfMeasurement>,
  ): Promise<UnitOfMeasurement> {
    const prisma = getPrisma();

    const existing = await this.findById(organizationId, id);
    if (!existing) {
      throw new UnitNotFoundError(id);
    }

    if (patch.code && patch.code !== existing.code) {
      const duplicate = await this.findByCode(organizationId, patch.code);
      if (duplicate && duplicate.id !== id) {
        throw new UnitDuplicateError(patch.code);
      }
    }

    try {
      const data: Prisma.UnitOfMeasurementUpdateInput = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.code !== undefined) data.code = patch.code;
      if (patch.description !== undefined) data.description = patch.description;
      if (patch.precision !== undefined) data.precision = patch.precision;
      if (patch.status !== undefined) data.status = patch.status;

      const row = await prisma.unitOfMeasurement.update({
        where: { id },
        data,
      });
      return toDomainUnit(row);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new UnitDuplicateError(patch.code ?? "");
      }
      throw err;
    }
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const prisma = getPrisma();
    const existing = await this.findById(organizationId, id);
    if (!existing) {
      throw new UnitNotFoundError(id);
    }
    await prisma.unitOfMeasurement.delete({ where: { id } });
  }
}

export const unitRepository = new PrismaUnitRepository();
