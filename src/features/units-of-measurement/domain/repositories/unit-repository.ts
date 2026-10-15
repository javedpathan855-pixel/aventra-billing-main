import type { UnitListFilter, UnitOfMeasurement } from "../entities/unit";

export type { UnitListFilter };

export type UnitListResult = {
  units: UnitOfMeasurement[];
  totalCount: number;
};

export type IUnitRepository = {
  findById(organizationId: string, id: string): Promise<UnitOfMeasurement | null>;
  findByCode(organizationId: string, code: string): Promise<UnitOfMeasurement | null>;
  list(organizationId: string, filter?: UnitListFilter): Promise<UnitListResult>;
  create(unit: UnitOfMeasurement): Promise<UnitOfMeasurement>;
  update(organizationId: string, id: string, patch: Partial<UnitOfMeasurement>): Promise<UnitOfMeasurement>;
  delete(organizationId: string, id: string): Promise<void>;
};
