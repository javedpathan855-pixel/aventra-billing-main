import "server-only";

import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import { toUnitDto } from "../mappers/unit-mappers";
import type { UnitDto } from "../dto/unit-dto";

export const getUnitById = async (id: string): Promise<UnitDto | null> => {
  const { organizationId } = await resolveUnitContext();
  const found = await unitRepository.findById(organizationId, id);
  return found ? toUnitDto(found) : null;
};
