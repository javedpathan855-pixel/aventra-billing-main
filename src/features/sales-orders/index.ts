/**
 * Public cross-feature API of the sales-orders feature.
 */
export type {
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  SalesOrderTotals,
  RelatedInvoiceSummary,
  TaxBreakdownSlab,
} from "./domain/entities/sales-order";

export type {
  ISalesOrderRepository,
  ListSalesOrdersFilters,
  ListSalesOrdersResult,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
} from "./domain/repositories/sales-order-repository";

export {
  calculateSalesOrderTotals,
  calculateExpectedDeliveryDate,
  validateSalesOrderLines,
  getTodayDateString,
} from "./domain/rules/sales-order-rules";

export {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionSalesOrderStatus,
  validateSalesOrderStatusTransition,
  canEditSalesOrder,
  canDeleteSalesOrder,
  canConfirmSalesOrder,
  canRecordFulfilment,
  canConvertToInvoice,
  canCancelSalesOrder,
} from "./domain/rules/sales-order-lifecycle-rules";

export {
  SalesOrderDomainError,
  SalesOrderNotFoundError,
  InvalidSalesOrderStatusTransitionError,
  SalesOrderLockedError,
  SalesOrderAlreadyInvoicedError,
  OverFulfilmentError,
  InvalidSalesOrderLineError,
  InvalidSalesOrderReferenceError,
  UnauthorizedSalesOrderAccessError,
} from "./domain/errors/sales-order-errors";

export { salesOrderRepository } from "./infrastructure/repositories/prisma-sales-order-repository";
export { getSalesOrders } from "./data/queries/get-sales-orders";
export { getSalesOrderById } from "./data/queries/get-sales-order-by-id";

export {
  createSalesOrderAction,
  updateSalesOrderAction,
  transitionSalesOrderStatusAction,
  deleteSalesOrderAction,
  convertEstimateToSalesOrderAction,
  convertSalesOrderToInvoiceAction,
  recordFulfilmentAction,
} from "./data/mutations/sales-order-mutations";

export { SalesOrderCreatePage } from "./presentation/page/SalesOrderCreatePage";
export { SalesOrderListPage } from "./presentation/page/SalesOrderListPage";
export { SalesOrderDetailPage } from "./presentation/page/SalesOrderDetailPage";
export { SalesOrderDocument } from "./presentation/components/SalesOrderDocument";
