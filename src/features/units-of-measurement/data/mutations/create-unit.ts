"use server";

import { revalidatePath } from "next/cache";
import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import { createUnitSchema } from "../validators/unit-schemas";
import { toUnitDto } from "../mappers/unit-mappers";
import { validateUnitCode, validateUnitName, validateUnitPrecision } from "../../domain/rules/unit-rules";
import { UnitDuplicateError } from "../../domain/errors/unit-errors";
import type { CreateUnitInput, UnitActionResult, UnitDto } from "../dto/unit-dto";

export const createUnitAction = async (
  input: CreateUnitInput,
): Promise<UnitActionResult<UnitDto>> => {
  try {
    const parseResult = createUnitSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return { success: false, error: "Validation failed. Please review the highlighted fields.", fieldErrors };
    }

    const { organizationId } = await resolveUnitContext();
    const data = parseResult.data;
    const code = validateUnitCode(data.code);
    const name = validateUnitName(data.name);
    const precision = validateUnitPrecision(data.precision);

    const existing = await unitRepository.findByCode(organizationId, code);
    if (existing) {
      throw new UnitDuplicateError(code);
    }

    const saved = await unitRepository.create({
      id: `uom_${crypto.randomUUID()}`,
      organizationId,
      name,
      code,
      description: data.description ?? null,
      precision,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/units");
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true, data: toUnitDto(saved) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
