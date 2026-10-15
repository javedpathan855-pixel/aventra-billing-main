import type { SalesOrder, SalesOrderStatus } from "../entities/sales-order";
import { InvalidSalesOrderStatusTransitionError } from "../errors/sales-order-errors";

/**
 * Valid state transitions for Sales Orders:
 *
 * Draft -> Confirmed, Cancelled
 * Confirmed -> PartiallyFulfilled, Fulfilled, Cancelled
 * PartiallyFulfilled -> Fulfilled, Cancelled
 * Fulfilled -> (Terminal)
 * Cancelled -> (Terminal)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  SalesOrderStatus,
  SalesOrderStatus[]
> = {
  Draft: ["Confirmed", "Cancelled"],
  Confirmed: ["PartiallyFulfilled", "Fulfilled", "Cancelled"],
  PartiallyFulfilled: ["Fulfilled", "Cancelled"],
  Fulfilled: [],
  Cancelled: [],
};

export const canTransitionSalesOrderStatus = (
  from: SalesOrderStatus,
  to: SalesOrderStatus,
): boolean => {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
};

export const validateSalesOrderStatusTransition = (
  currentStatus: SalesOrderStatus,
  targetStatus: SalesOrderStatus,
): void => {
  if (!canTransitionSalesOrderStatus(currentStatus, targetStatus)) {
    throw new InvalidSalesOrderStatusTransitionError(
      currentStatus,
      targetStatus,
      `Permitted next statuses from "${currentStatus}" are: ${
        ALLOWED_STATUS_TRANSITIONS[currentStatus].join(", ") || "None (terminal state)"
      }`,
    );
  }
};

/**
 * Editing line items and pricing is strictly permitted only in Draft status.
 */
export const canEditSalesOrder = (order: Pick<SalesOrder, "status">): boolean => {
  return order.status === "Draft";
};

/**
 * Deleting a sales order is permitted only when it is a Draft.
 */
export const canDeleteSalesOrder = (
  order: Pick<SalesOrder, "status">,
): boolean => {
  return order.status === "Draft";
};

/**
 * Confirming a sales order locks it against casual draft editing and enables
 * downstream fulfilment and invoice generation.
 */
export const canConfirmSalesOrder = (
  order: Pick<SalesOrder, "status">,
): boolean => {
  return order.status === "Draft";
};

/**
 * Fulfilment can be recorded against Confirmed or PartiallyFulfilled orders.
 */
export const canRecordFulfilment = (
  order: Pick<SalesOrder, "status">,
): boolean => {
  return order.status === "Confirmed" || order.status === "PartiallyFulfilled";
};

/**
 * Genuine Invoices can be generated only from confirmed or fulfilled orders.
 * Draft and Cancelled orders cannot be invoiced.
 */
export const canConvertToInvoice = (
  order: Pick<SalesOrder, "status">,
): boolean => {
  return (
    order.status === "Confirmed" ||
    order.status === "PartiallyFulfilled" ||
    order.status === "Fulfilled"
  );
};

/**
 * Cancellation is allowed for active (non-fulfilled, non-cancelled) orders.
 */
export const canCancelSalesOrder = (
  order: Pick<SalesOrder, "status">,
): boolean => {
  return (
    order.status === "Draft" ||
    order.status === "Confirmed" ||
    order.status === "PartiallyFulfilled"
  );
};
