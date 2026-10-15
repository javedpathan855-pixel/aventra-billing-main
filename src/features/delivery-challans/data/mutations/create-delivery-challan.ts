"use server";

import { revalidatePath } from "next/cache";
import { resolveDeliveryChallanContext } from "../context/delivery-challan-context";
import { deliveryChallanRepository } from "../../infrastructure/repositories/prisma-delivery-challan-repository";
import { createDeliveryChallanSchema } from "../validators/delivery-challan-schemas";
import type {
  CreateDeliveryChallanInputDto,
  DeliveryChallanActionResult,
} from "../dto/delivery-challan-dto";
import type { DeliveryChallan } from "../../domain/entities/delivery-challan";

export const createDeliveryChallanAction = async (
  input: CreateDeliveryChallanInputDto,
): Promise<DeliveryChallanActionResult<DeliveryChallan>> => {
  try {
    const { organizationId } = await resolveDeliveryChallanContext();

    const parseResult = createDeliveryChallanSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const data = parseResult.data;

    const created = await deliveryChallanRepository.create(organizationId, {
      customerId: data.customerId || null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      customerGstin: data.customerGstin || null,
      salesOrderId: data.salesOrderId || null,
      invoiceId: data.invoiceId || null,
      challanDate: new Date(data.challanDate),
      dispatchDate: data.dispatchDate ? new Date(data.dispatchDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      deliveryAddress: data.deliveryAddress || null,
      transporterName: data.transporterName || null,
      vehicleNumber: data.vehicleNumber || null,
      trackingNumber: data.trackingNumber || null,
      transportMode: data.transportMode || null,
      deliveryReason: data.deliveryReason,
      recipientName: data.recipientName || null,
      recipientPhone: data.recipientPhone || null,
      notes: data.notes || null,
      terms: data.terms || null,
      items: data.items.map((it) => ({
        salesOrderItemId: it.salesOrderItemId || null,
        productId: it.productId || null,
        item: it.item,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        unit: it.unit || "PCS",
        orderedQuantity: it.orderedQuantity,
        deliveredQuantity: it.deliveredQuantity,
        sortOrder: it.sortOrder,
      })),
    });

    revalidatePath("/delivery-challans");
    if (data.salesOrderId) {
      revalidatePath(`/sales-orders/${data.salesOrderId}`);
      revalidatePath("/sales-orders");
    }

    return {
      success: true,
      data: created,
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
