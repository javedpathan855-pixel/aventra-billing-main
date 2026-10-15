import "server-only";

import { resolvePurchaseOrderContext } from "../context/purchase-order-context";
import { purchaseOrderRepository } from "../../infrastructure/repositories/prisma-purchase-order-repository";
import type { PurchaseOrder } from "../../domain/entities/purchase-order";

export const getPurchaseOrderById = async (
  id: string,
): Promise<PurchaseOrder | null> => {
  const { organizationId } = await resolvePurchaseOrderContext();
  return purchaseOrderRepository.findById(organizationId, id);
};

export const getPurchaseOrderByNumber = async (
  orderNumber: string,
): Promise<PurchaseOrder | null> => {
  const { organizationId } = await resolvePurchaseOrderContext();
  return purchaseOrderRepository.findByNumber(organizationId, orderNumber);
};
