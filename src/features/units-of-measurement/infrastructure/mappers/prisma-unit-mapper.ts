import type { UnitOfMeasurement as PrismaUnit } from "@/generated/prisma/client";
import type { UnitOfMeasurement, UnitStatus } from "../../domain/entities/unit";

export const toDomainUnit = (row: PrismaUnit): UnitOfMeasurement => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  code: row.code,
  description: row.description,
  precision: row.precision,
  status: row.status as UnitStatus,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
