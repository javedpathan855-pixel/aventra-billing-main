"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import {
  ForbiddenUnitActionError,
  UnitInUseError,
  UnitNotFoundError,
} from "../../domain/errors/unit-errors";
import type { UnitActionResult } from "../dto/unit-dto";

export const deleteUnitAction = async (id: string): Promise<UnitActionResult<void>> => {
  try {
    const { organizationId, memberRole } = await resolveUnitContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new ForbiddenUnitActionError("Only organization admins can delete units.");
    }

    const existing = await unitRepository.findById(organizationId, id);
    if (!existing) {
      throw new UnitNotFoundError(id);
    }

    const usage = await productRepository.list(organizationId, {
      unit: existing.code,
      limit: 1,
      offset: 0,
    });
    if (usage.totalCount > 0) {
      throw new UnitInUseError(existing.code, usage.totalCount);
    }

    await unitRepository.delete(organizationId, id);

    revalidatePath("/units");
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
