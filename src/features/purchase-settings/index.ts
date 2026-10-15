/**
 * Public cross-feature API of the purchase-settings feature.
 */
export type {
  PurchaseSettings,
  PurchaseOrderNumberComponents,
  PurchaseBillNumberComponents,
  PurchaseReturnNumberComponents,
} from "./domain/entities/purchase-settings";
export type {
  AllocatedPurchaseOrderNumber,
  AllocatedPurchaseBillNumber,
  AllocatedPurchaseReturnNumber,
  IPurchaseSettingsRepository,
  SavePurchaseSettingsInput,
} from "./domain/repositories/purchase-settings-repository";
export {
  DEFAULT_PURCHASE_SETTINGS,
  formatPurchaseOrderNumber,
  formatPurchaseBillNumber,
  formatPurchaseReturnNumber,
} from "./domain/rules/purchase-settings-rules";
export { purchaseSettingsRepository } from "./infrastructure/repositories/prisma-purchase-settings-repository";
export { getPurchaseSettings } from "./data/queries/get-purchase-settings";
export { savePurchaseSettingsAction } from "./data/mutations/save-purchase-settings";
export { PurchaseSettingsPage } from "./presentation/page/PurchaseSettingsPage";
