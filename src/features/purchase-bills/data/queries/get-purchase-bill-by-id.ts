import "server-only";

import { resolvePurchaseBillContext } from "../context/purchase-bill-context";
import { purchaseBillRepository } from "../../infrastructure/repositories/prisma-purchase-bill-repository";
import type { PurchaseBill } from "../../domain/entities/purchase-bill";

export const getPurchaseBillById = async (
  id: string,
): Promise<PurchaseBill | null> => {
  const { organizationId } = await resolvePurchaseBillContext();
  return purchaseBillRepository.findById(organizationId, id);
};

export const getPurchaseBillByNumber = async (
  billNumber: string,
): Promise<PurchaseBill | null> => {
  const { organizationId } = await resolvePurchaseBillContext();
  return purchaseBillRepository.findByNumber(organizationId, billNumber);
};
