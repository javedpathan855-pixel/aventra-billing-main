import "server-only";

import { resolvePurchaseBillContext } from "../context/purchase-bill-context";
import { purchaseBillRepository } from "../../infrastructure/repositories/prisma-purchase-bill-repository";
import type {
  ListPurchaseBillsFilters,
  ListPurchaseBillsResult,
} from "../../domain/repositories/purchase-bill-repository";

export const getPurchaseBills = async (
  filters?: ListPurchaseBillsFilters,
): Promise<ListPurchaseBillsResult> => {
  const { organizationId } = await resolvePurchaseBillContext();
  return purchaseBillRepository.listWithFilters(organizationId, filters);
};
