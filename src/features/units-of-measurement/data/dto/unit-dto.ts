import type { UnitOption, UnitStatus } from "../../domain/entities/unit";

export type UnitDto = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  description?: string | null;
  precision: number;
  status: UnitStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateUnitInput = {
  name: string;
  code: string;
  description?: string | null;
  precision?: number;
};

export type UpdateUnitInput = Partial<CreateUnitInput> & {
  status?: UnitStatus;
};

export type UnitFilterInput = {
  query?: string;
  status?: UnitStatus | "ALL";
  page?: number;
  pageSize?: number;
};

export type UnitActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export type { UnitOption };
