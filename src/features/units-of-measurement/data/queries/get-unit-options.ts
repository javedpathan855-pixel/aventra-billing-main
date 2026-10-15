import "server-only";

import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import type { UnitOption } from "../../domain/entities/unit";

/**
 * Active units for product and line-item dropdowns, alphabetically sorted.
 * An empty list tells callers the organization has not adopted the master
 * yet, in which case callers fall back to the legacy standard units.
 */
export const getUnitOptions = async (): Promise<UnitOption[]> => {
  const { organizationId } = await resolveUnitContext();
  const result = await unitRepository.list(organizationId, {
    status: "ACTIVE",
    limit: 200,
    offset: 0,
  });
  return result.units.map((u) => ({ code: u.code, name: u.name, precision: u.precision }));
};
