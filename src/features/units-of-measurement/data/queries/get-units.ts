import "server-only";

import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import { toUnitDto } from "../mappers/unit-mappers";
import type { UnitDto, UnitFilterInput } from "../dto/unit-dto";

export type GetUnitsResult = {
  units: UnitDto[];
  totalCount: number;
};

export const getUnits = async (filter?: UnitFilterInput): Promise<GetUnitsResult> => {
  const { organizationId } = await resolveUnitContext();

  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 10;

  const result = await unitRepository.list(organizationId, {
    status: filter?.status,
    query: filter?.query,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    units: result.units.map(toUnitDto),
    totalCount: result.totalCount,
  };
};
