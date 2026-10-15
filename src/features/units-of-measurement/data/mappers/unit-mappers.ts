import type { UnitOfMeasurement } from "../../domain/entities/unit";
import type { UnitDto } from "../dto/unit-dto";

export const toUnitDto = (u: UnitOfMeasurement): UnitDto => ({
  id: u.id,
  organizationId: u.organizationId,
  name: u.name,
  code: u.code,
  description: u.description ?? null,
  precision: u.precision,
  status: u.status,
  createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  updatedAt: u.updatedAt instanceof Date ? u.updatedAt.toISOString() : String(u.updatedAt),
});
