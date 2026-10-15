"use server";

import { revalidatePath } from "next/cache";
import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import { DEFAULT_UNITS, MAX_UNIT_PRECISION } from "../../domain/rules/unit-rules";
import type { UnitActionResult } from "../dto/unit-dto";

export type SeedUnitsResult = {
  created: number;
  skipped: number;
};

/**
 * Seeds the standard units for organizations adopting the master. Additive
 * only: existing records (matched case-insensitively by code) are never
 * modified, so re-running is safe.
 */
export const seedDefaultUnitsAction = async (): Promise<UnitActionResult<SeedUnitsResult>> => {
  try {
    const { organizationId } = await resolveUnitContext();

    let created = 0;
    let skipped = 0;
    for (const def of DEFAULT_UNITS) {
      const existing = await unitRepository.findByCode(organizationId, def.code);
      if (existing) {
        skipped += 1;
        continue;
      }
      await unitRepository.create({
        id: `uom_${crypto.randomUUID()}`,
        organizationId,
        name: def.name,
        code: def.code,
        description: def.description,
        precision: MAX_UNIT_PRECISION,
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      created += 1;
    }

    revalidatePath("/units");
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true, data: { created, skipped } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
