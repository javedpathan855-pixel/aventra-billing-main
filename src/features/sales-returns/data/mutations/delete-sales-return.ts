"use server";

import { revalidatePath } from "next/cache";
import { resolveSalesReturnContext } from "../context/sales-return-context";
import { salesReturnRepository } from "../../infrastructure/repositories/prisma-sales-return-repository";
import type { SalesReturnActionResult } from "../dto/sales-return-dto";

export const deleteSalesReturnAction = async (
  id: string,
): Promise<SalesReturnActionResult<boolean>> => {
  try {
    const { organizationId } = await resolveSalesReturnContext();

    await salesReturnRepository.delete(id, organizationId);

    revalidatePath("/sales-returns");

    return {
      success: true,
      data: true,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
