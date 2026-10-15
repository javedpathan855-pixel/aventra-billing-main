/**
 * Public cross-feature API of the sales-settings feature.
 */
export type {
  SalesSettings,
  EstimateNumberComponents,
  SalesOrderNumberComponents,
  DeliveryChallanNumberComponents,
  SalesReturnNumberComponents,
} from "./domain/entities/sales-settings";
export type {
  AllocatedEstimateNumber,
  AllocatedSalesOrderNumber,
  AllocatedDeliveryChallanNumber,
  AllocatedSalesReturnNumber,
  ISalesSettingsRepository,
  SaveSalesSettingsInput,
} from "./domain/repositories/sales-settings-repository";
export {
  DEFAULT_SALES_SETTINGS,
  formatEstimateNumber,
  formatSalesOrderNumber,
  formatDeliveryChallanNumber,
  formatSalesReturnNumber,
} from "./domain/rules/sales-settings-rules";
export { salesSettingsRepository } from "./infrastructure/repositories/prisma-sales-settings-repository";
export { getSalesSettings } from "./data/queries/get-sales-settings";
export { saveSalesSettingsAction } from "./data/mutations/save-sales-settings";
