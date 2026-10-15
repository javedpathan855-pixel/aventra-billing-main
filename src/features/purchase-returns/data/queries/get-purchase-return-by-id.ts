import "server-only";

import { resolvePurchaseReturnContext } from "../context/purchase-return-context";
import { purchaseReturnRepository } from "../../infrastructure/repositories/prisma-purchase-return-repository";
import type { PurchaseReturn } from "../../domain/entities/purchase-return";

export const getPurchaseReturnById = async (
  id: string,
): Promise<PurchaseReturn | null> => {
  const { organizationId } = await resolvePurchaseReturnContext();
  return purchaseReturnRepository.findById(organizationId, id);
};

export const getPurchaseReturnByNumber = async (
  returnNumber: string,
): Promise<PurchaseReturn | null> => {
  const { organizationId } = await resolvePurchaseReturnContext();
  return purchaseReturnRepository.findByNumber(organizationId, returnNumber);
};
