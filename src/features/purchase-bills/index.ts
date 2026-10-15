/**
 * Public cross-feature API of the purchase-bills feature.
 */
export type {
  PurchaseBill,
  PurchaseBillItem,
  PurchaseBillStatus,
  PurchaseBillTotals,
  TaxBreakdownSlab,
} from "./domain/entities/purchase-bill";

export type {
  IPurchaseBillRepository,
  ListPurchaseBillsFilters,
  ListPurchaseBillsResult,
  CreatePurchaseBillInput,
  UpdatePurchaseBillInput,
} from "./domain/repositories/purchase-bill-repository";

export {
  calculatePurchaseBillTotals,
  calculateDefaultDueDate,
  validatePurchaseBillLines,
  validatePurchaseBillDates,
  getTodayDateString,
} from "./domain/rules/purchase-bill-rules";

export {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionPurchaseBillStatus,
  validatePurchaseBillStatusTransition,
  canEditPurchaseBill,
  canDeletePurchaseBill,
  canConfirmPurchaseBill,
  canCancelPurchaseBill,
} from "./domain/rules/purchase-bill-lifecycle-rules";

export {
  PurchaseBillDomainError,
  PurchaseBillNotFoundError,
  InvalidPurchaseBillStatusTransitionError,
  PurchaseBillLockedError,
  DuplicateSupplierInvoiceError,
  InvalidPurchaseBillLineError,
  InvalidPurchaseBillReferenceError,
  UnauthorizedPurchaseBillAccessError,
} from "./domain/errors/purchase-bill-errors";

export { purchaseBillRepository } from "./infrastructure/repositories/prisma-purchase-bill-repository";
export { getPurchaseBills } from "./data/queries/get-purchase-bills";
export { getPurchaseBillById } from "./data/queries/get-purchase-bill-by-id";

export {
  createPurchaseBillAction,
  updatePurchaseBillAction,
  transitionPurchaseBillStatusAction,
  deletePurchaseBillAction,
} from "./data/mutations/purchase-bill-mutations";

export { PurchaseBillCreatePage } from "./presentation/page/PurchaseBillCreatePage";
export { PurchaseBillListPage } from "./presentation/page/PurchaseBillListPage";
export { PurchaseBillDetailPage } from "./presentation/page/PurchaseBillDetailPage";
export { PurchaseBillDocument } from "./presentation/components/PurchaseBillDocument";
