"use server";

import { revalidatePath } from "next/cache";
import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import { updateUnitSchema } from "../validators/unit-schemas";
import { toUnitDto } from "../mappers/unit-mappers";
import { validateUnitCode, validateUnitName, validateUnitPrecision } from "../../domain/rules/unit-rules";
import { UnitDuplicateError, UnitNotFoundError } from "../../domain/errors/unit-errors";
import type { UnitOfMeasurement } from "../../domain/entities/unit";
import type { UnitActionResult, UnitDto, UpdateUnitInput } from "../dto/unit-dto";

export const updateUnitAction = async (
  id: string,
  input: UpdateUnitInput,
): Promise<UnitActionResult<UnitDto>> => {
  try {
    const parseResult = updateUnitSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return { success: false, error: "Validation failed. Please review the highlighted fields.", fieldErrors };
    }

    const { organizationId } = await resolveUnitContext();
    const data = parseResult.data;

    const existing = await unitRepository.findById(organizationId, id);
    if (!existing) {
      throw new UnitNotFoundError(id);
    }

    const patch: Partial<UnitOfMeasurement> = {};
    if (data.name !== undefined) patch.name = validateUnitName(data.name);
    if (data.code !== undefined) {
      const code = validateUnitCode(data.code);
      if (code !== existing.code) {
        const duplicate = await unitRepository.findByCode(organizationId, code);
        if (duplicate && duplicate.id !== id) {
          throw new UnitDuplicateError(code);
        }
      }
      patch.code = code;
    }
    if (data.description !== undefined) patch.description = data.description ?? null;
    if (data.precision !== undefined) patch.precision = validateUnitPrecision(data.precision);
    if (data.status !== undefined) patch.status = data.status;
    patch.updatedAt = new Date();

    const saved = await unitRepository.update(organizationId, id, patch);

    revalidatePath("/units");
    revalidatePath(`/units/${id}`);
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true, data: toUnitDto(saved) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
