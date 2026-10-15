"use server";

import { revalidatePath } from "next/cache";
import { resolveSupplierContext } from "../context/supplier-context";
import { supplierRepository } from "../../infrastructure/repositories/prisma-supplier-repository";
import { updateSupplierStatusSchema } from "../validators/supplier-schemas";
import { toSupplierDto } from "../mappers/supplier-mappers";
import { SupplierNotFoundError } from "../../domain/errors/supplier-errors";
import { assertValidSupplierStatusTransition } from "../../domain/rules/supplier-rules";
import type { SupplierActionResult, SupplierDto } from "../dto/supplier-dto";
import type { SupplierStatus } from "../../domain/entities/supplier";

export const updateSupplierStatusAction = async (
  id: string,
  status: SupplierStatus,
): Promise<SupplierActionResult<SupplierDto>> => {
  try {
    const parseResult = updateSupplierStatusSchema.safeParse({ status });
    if (!parseResult.success) {
      return {
        success: false,
        error: "Invalid supplier status.",
      };
    }

    const { organizationId } = await resolveSupplierContext();
    const existing = await supplierRepository.findById(organizationId, id);
    if (!existing) {
      throw new SupplierNotFoundError(id);
    }

    assertValidSupplierStatusTransition(existing.status, parseResult.data.status);

    const updated = await supplierRepository.updateStatus(
      organizationId,
      id,
      parseResult.data.status,
    );
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${id}`);

    return {
      success: true,
      data: toSupplierDto(updated),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
