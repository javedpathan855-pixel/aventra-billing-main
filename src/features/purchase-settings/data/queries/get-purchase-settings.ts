import "server-only";

import { resolvePurchaseSettingsContext } from "../context/purchase-settings-context";
import { purchaseSettingsRepository } from "../../infrastructure/repositories/prisma-purchase-settings-repository";
import type { PurchaseSettings } from "../../domain/entities/purchase-settings";

export const getPurchaseSettings = async (): Promise<PurchaseSettings> => {
  const { organizationId } = await resolvePurchaseSettingsContext();
  return purchaseSettingsRepository.getSettings(organizationId);
};
