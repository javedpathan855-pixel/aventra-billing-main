/**
 * Public cross-feature API of the purchase-returns feature.
 */
export type {
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnStatus,
  ReturnableBill,
  ReturnableBillItem,
  ReturnDisposition,
} from "./domain/entities/purchase-return";

export type {
  IPurchaseReturnRepository,
  ListPurchaseReturnsFilters,
  ListPurchaseReturnsResult,
  CreatePurchaseReturnInput,
  CreatePurchaseReturnItemInput,
  UpdatePurchaseReturnStatusInput,
} from "./domain/repositories/purchase-return-repository";

export {
  calculatePurchaseReturnLineTotals,
  calculatePurchaseReturnTotals,
  calculateRemainingReturnableQuantity,
  assertReturnableQuantity,
  canTransitionPurchaseReturnStatus,
  assertValidPurchaseReturnStatusTransition,
  canDeletePurchaseReturn,
} from "./domain/rules/purchase-return-rules";

export {
  PurchaseReturnDomainError,
  InvalidPurchaseReturnStatusTransitionError,
  OverReturnError,
  InvalidPurchaseReturnReferenceError,
  PurchaseReturnNotFoundError,
  PurchaseReturnLockedError,
  UnauthorizedPurchaseReturnAccessError,
} from "./domain/errors/purchase-return-errors";

export { purchaseReturnRepository } from "./infrastructure/repositories/prisma-purchase-return-repository";
export { getPurchaseReturns } from "./data/queries/get-purchase-returns";
export { getPurchaseReturnById } from "./data/queries/get-purchase-return-by-id";
export { getReturnableBills } from "./data/queries/get-returnable-bills";

export {
  createPurchaseReturnAction,
  updatePurchaseReturnStatusAction,
  deletePurchaseReturnAction,
} from "./data/mutations/purchase-return-mutations";

export { PurchaseReturnCreatePage } from "./presentation/page/PurchaseReturnCreatePage";
export { PurchaseReturnListPage } from "./presentation/page/PurchaseReturnListPage";
export { PurchaseReturnDetailPage } from "./presentation/page/PurchaseReturnDetailPage";
export { PurchaseReturnDocument } from "./presentation/components/PurchaseReturnDocument";
