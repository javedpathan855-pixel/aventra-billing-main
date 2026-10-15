"use server";

import { revalidatePath } from "next/cache";
import { resolveDeliveryChallanContext } from "../context/delivery-challan-context";
import { deliveryChallanRepository } from "../../infrastructure/repositories/prisma-delivery-challan-repository";
import type { DeliveryChallanActionResult } from "../dto/delivery-challan-dto";

export const deleteDeliveryChallanAction = async (
  id: string,
): Promise<DeliveryChallanActionResult<boolean>> => {
  try {
    const { organizationId } = await resolveDeliveryChallanContext();

    await deliveryChallanRepository.delete(id, organizationId);

    revalidatePath("/delivery-challans");

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
