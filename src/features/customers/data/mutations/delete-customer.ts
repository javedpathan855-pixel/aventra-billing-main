"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveCustomerContext } from "../context/customer-context";
import { customerRepository } from "../../infrastructure/repositories/prisma-customer-repository";
import { CustomerNotFoundError, ForbiddenCustomerActionError } from "../../domain/errors/customer-errors";
import type { CustomerActionResult } from "../dto/customer-dto";

export const deleteCustomerAction = async (
  id: string,
): Promise<CustomerActionResult<{ id: string }>> => {
  try {
    const { organizationId, memberRole } = await resolveCustomerContext();
    // DEF-006: deleting a customer removes shared reference data — owner/admin only.
    if (!isOrganizationAdmin(memberRole)) {
      throw new ForbiddenCustomerActionError();
    }
    const existing = await customerRepository.findById(organizationId, id);
    if (!existing) {
      throw new CustomerNotFoundError(id);
    }

    await customerRepository.delete(organizationId, id);
    revalidatePath("/customers");

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
