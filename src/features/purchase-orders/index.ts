/**
 * Public cross-feature API of the purchase-orders feature.
 */
export type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseOrderTotals,
  TaxBreakdownSlab,
} from "./domain/entities/purchase-order";

export type {
  IPurchaseOrderRepository,
  ListPurchaseOrdersFilters,
  ListPurchaseOrdersResult,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from "./domain/repositories/purchase-order-repository";

export {
  calculatePurchaseOrderTotals,
  calculateExpectedDeliveryDate,
  validatePurchaseOrderLines,
  getTodayDateString,
} from "./domain/rules/purchase-order-rules";

export {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionPurchaseOrderStatus,
  validatePurchaseOrderStatusTransition,
  canEditPurchaseOrder,
  canDeletePurchaseOrder,
  canConfirmPurchaseOrder,
  canRecordReceiving,
  canCancelPurchaseOrder,
} from "./domain/rules/purchase-order-lifecycle-rules";

export {
  PurchaseOrderDomainError,
  PurchaseOrderNotFoundError,
  InvalidPurchaseOrderStatusTransitionError,
  PurchaseOrderLockedError,
  OverReceivingError,
  InvalidPurchaseOrderLineError,
  InvalidPurchaseOrderReferenceError,
  UnauthorizedPurchaseOrderAccessError,
} from "./domain/errors/purchase-order-errors";

export { purchaseOrderRepository } from "./infrastructure/repositories/prisma-purchase-order-repository";
export { getPurchaseOrders } from "./data/queries/get-purchase-orders";
export { getPurchaseOrderById } from "./data/queries/get-purchase-order-by-id";

export {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
  transitionPurchaseOrderStatusAction,
  deletePurchaseOrderAction,
  recordReceivingAction,
} from "./data/mutations/purchase-order-mutations";

export { PurchaseOrderCreatePage } from "./presentation/page/PurchaseOrderCreatePage";
export { PurchaseOrderListPage } from "./presentation/page/PurchaseOrderListPage";
export { PurchaseOrderDetailPage } from "./presentation/page/PurchaseOrderDetailPage";
export { PurchaseOrderDocument } from "./presentation/components/PurchaseOrderDocument";
