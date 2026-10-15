import "server-only";

import { resolvePurchaseReturnContext } from "../context/purchase-return-context";
import { purchaseReturnRepository } from "../../infrastructure/repositories/prisma-purchase-return-repository";
import type {
  ListPurchaseReturnsFilters,
  ListPurchaseReturnsResult,
} from "../../domain/repositories/purchase-return-repository";

export const getPurchaseReturns = async (
  filters?: ListPurchaseReturnsFilters,
): Promise<ListPurchaseReturnsResult> => {
  const { organizationId } = await resolvePurchaseReturnContext();
  return purchaseReturnRepository.listWithFilters(organizationId, filters);
};
