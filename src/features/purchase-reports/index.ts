/**
 * Public cross-feature API of the purchase-reports feature.
 */
export type {
  PurchaseReportFilters,
  PurchaseSummaryMetrics,
  SupplierPurchaseRow,
  OutstandingBillRow,
  OutstandingPayables,
  PurchaseTaxSummary,
  PaymentMethodSummary,
  SupplierPaymentSummary,
  PaymentSummary,
  StatusCountSummary,
  OrderSummary,
  ReturnSummary,
  PurchaseReportsBundle,
} from "./domain/entities/purchase-report";

export { calculateBillOutstanding } from "./domain/entities/purchase-report";

export type { IPurchaseReportRepository } from "./domain/repositories/purchase-report-repository";

export {
  PurchaseReportDomainError,
  UnauthorizedPurchaseReportAccessError,
} from "./domain/errors/purchase-report-errors";

export { purchaseReportRepository } from "./infrastructure/repositories/prisma-purchase-report-repository";
export { getPurchaseReports } from "./data/queries/get-purchase-reports";

export { PurchaseReportsPage } from "./presentation/page/PurchaseReportsPage";
