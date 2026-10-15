import "server-only";

import { resolveSalesSettingsContext } from "../context/sales-settings-context";
import { salesSettingsRepository } from "../../infrastructure/repositories/prisma-sales-settings-repository";
import type { SalesSettings } from "../../domain/entities/sales-settings";

export const getSalesSettings = async (): Promise<SalesSettings> => {
  const { organizationId } = await resolveSalesSettingsContext();
  return salesSettingsRepository.getSettings(organizationId);
};
