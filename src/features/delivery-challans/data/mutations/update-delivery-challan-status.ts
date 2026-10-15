"use server";

import { revalidatePath } from "next/cache";
import { resolveDeliveryChallanContext } from "../context/delivery-challan-context";
import { deliveryChallanRepository } from "../../infrastructure/repositories/prisma-delivery-challan-repository";
import { updateDeliveryChallanStatusSchema } from "../validators/delivery-challan-schemas";
import type {
  UpdateDeliveryChallanStatusInputDto,
  DeliveryChallanActionResult,
} from "../dto/delivery-challan-dto";
import type { DeliveryChallan } from "../../domain/entities/delivery-challan";

export const updateDeliveryChallanStatusAction = async (
  id: string,
  input: UpdateDeliveryChallanStatusInputDto,
): Promise<DeliveryChallanActionResult<DeliveryChallan>> => {
  try {
    const { organizationId } = await resolveDeliveryChallanContext();

    const parseResult = updateDeliveryChallanStatusSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors,
      };
    }

    const data = parseResult.data;

    const updated = await deliveryChallanRepository.updateStatus(id, organizationId, {
      status: data.status,
      dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : undefined,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      transporterName: data.transporterName,
      vehicleNumber: data.vehicleNumber,
      trackingNumber: data.trackingNumber,
      notes: data.notes,
    });

    revalidatePath("/delivery-challans");
    revalidatePath(`/delivery-challans/${id}`);
    if (updated.salesOrderId) {
      revalidatePath(`/sales-orders/${updated.salesOrderId}`);
      revalidatePath("/sales-orders");
    }

    return {
      success: true,
      data: updated,
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
