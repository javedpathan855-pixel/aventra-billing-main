import "server-only";

import { resolvePurchaseReportContext } from "../context/purchase-report-context";
import { purchaseReportRepository } from "../../infrastructure/repositories/prisma-purchase-report-repository";
import type {
  PurchaseReportFilters,
  PurchaseReportsBundle,
} from "../../domain/entities/purchase-report";

export const getPurchaseReports = async (
  filters?: PurchaseReportFilters,
): Promise<PurchaseReportsBundle> => {
  const { organizationId } = await resolvePurchaseReportContext();
  return purchaseReportRepository.getReports(organizationId, filters);
};
