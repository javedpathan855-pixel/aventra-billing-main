import type {
  PurchaseReportFilters,
  PurchaseReportsBundle,
} from "../entities/purchase-report";

export interface IPurchaseReportRepository {
  getReports(
    organizationId: string,
    filters?: PurchaseReportFilters,
    txClient?: unknown,
  ): Promise<PurchaseReportsBundle>;
}
