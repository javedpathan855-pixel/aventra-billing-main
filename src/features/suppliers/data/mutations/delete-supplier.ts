"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveSupplierContext } from "../context/supplier-context";
import { supplierRepository } from "../../infrastructure/repositories/prisma-supplier-repository";
import {
  ForbiddenSupplierActionError,
  SupplierNotFoundError,
} from "../../domain/errors/supplier-errors";
import type { SupplierActionResult } from "../dto/supplier-dto";

export const deleteSupplierAction = async (
  id: string,
): Promise<SupplierActionResult<{ id: string }>> => {
  try {
    const { organizationId, memberRole } = await resolveSupplierContext();

    if (!isOrganizationAdmin(memberRole)) {
      throw new ForbiddenSupplierActionError();
    }

    const existing = await supplierRepository.findById(organizationId, id);
    if (!existing) {
      throw new SupplierNotFoundError(id);
    }

    await supplierRepository.delete(organizationId, id);
    revalidatePath("/suppliers");

    return {
      success: true,
      data: { id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
