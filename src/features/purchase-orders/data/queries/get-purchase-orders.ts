import "server-only";

import { resolvePurchaseOrderContext } from "../context/purchase-order-context";
import { purchaseOrderRepository } from "../../infrastructure/repositories/prisma-purchase-order-repository";
import type {
  ListPurchaseOrdersFilters,
  ListPurchaseOrdersResult,
} from "../../domain/repositories/purchase-order-repository";

export const getPurchaseOrders = async (
  filters?: ListPurchaseOrdersFilters,
): Promise<ListPurchaseOrdersResult> => {
  const { organizationId } = await resolvePurchaseOrderContext();
  return purchaseOrderRepository.listWithFilters(organizationId, filters);
};
