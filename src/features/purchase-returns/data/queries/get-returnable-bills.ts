import "server-only";

import { resolvePurchaseReturnContext } from "../context/purchase-return-context";
import { purchaseReturnRepository } from "../../infrastructure/repositories/prisma-purchase-return-repository";
import type { ReturnableBill } from "../../domain/entities/purchase-return";

export const getReturnableBills = async (
  supplierId?: string,
): Promise<ReturnableBill[]> => {
  const { organizationId } = await resolvePurchaseReturnContext();
  return purchaseReturnRepository.getReturnableBills(organizationId, supplierId);
};

export const getReturnableBillById = async (
  billId: string,
): Promise<ReturnableBill | null> => {
  const { organizationId } = await resolvePurchaseReturnContext();
  return purchaseReturnRepository.getReturnableBillById(organizationId, billId);
};
