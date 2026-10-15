export type UnitStatus = "ACTIVE" | "INACTIVE";

export type UnitOfMeasurement = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  precision: number;
  status: UnitStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UnitListFilter = {
  status?: UnitStatus | "ALL";
  query?: string;
  limit?: number;
  offset?: number;
};

export type UnitOption = {
  code: string;
  name: string;
  precision: number;
};

export const normalizeUnitCode = (code: string): string =>
  code.trim().toUpperCase().replace(/\s+/g, "");
