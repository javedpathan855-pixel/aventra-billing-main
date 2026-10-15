import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "../entities/purchase-order";
import { InvalidPurchaseOrderStatusTransitionError } from "../errors/purchase-order-errors";

/**
 * Valid state transitions for Purchase Orders:
 *
 * Draft -> Confirmed, Cancelled
 * Confirmed -> PartiallyReceived, Received, Cancelled
 * PartiallyReceived -> Received, Cancelled
 * Received -> (Terminal)
 * Cancelled -> (Terminal)
 *
 * Receiving progress (PartiallyReceived/Received) is derived exclusively from
 * recorded goods receipts, never from creation or approval alone.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  PurchaseOrderStatus,
  PurchaseOrderStatus[]
> = {
  Draft: ["Confirmed", "Cancelled"],
  Confirmed: ["PartiallyReceived", "Received", "Cancelled"],
  PartiallyReceived: ["Received", "Cancelled"],
  Received: [],
  Cancelled: [],
};

export const canTransitionPurchaseOrderStatus = (
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): boolean => {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
};

export const validatePurchaseOrderStatusTransition = (
  currentStatus: PurchaseOrderStatus,
  targetStatus: PurchaseOrderStatus,
): void => {
  if (!canTransitionPurchaseOrderStatus(currentStatus, targetStatus)) {
    throw new InvalidPurchaseOrderStatusTransitionError(
      currentStatus,
      targetStatus,
      `Permitted next statuses from "${currentStatus}" are: ${
        ALLOWED_STATUS_TRANSITIONS[currentStatus].join(", ") ||
        "None (terminal state)"
      }`,
    );
  }
};

/**
 * Editing line items and pricing is strictly permitted only in Draft status.
 */
export const canEditPurchaseOrder = (
  order: Pick<PurchaseOrder, "status">,
): boolean => {
  return order.status === "Draft";
};

/**
 * Deleting a purchase order is permitted only when it is a Draft.
 */
export const canDeletePurchaseOrder = (
  order: Pick<PurchaseOrder, "status">,
): boolean => {
  return order.status === "Draft";
};

/**
 * Confirming a purchase order locks it against casual draft editing and
 * enables downstream goods receiving.
 */
export const canConfirmPurchaseOrder = (
  order: Pick<PurchaseOrder, "status">,
): boolean => {
  return order.status === "Draft";
};

/**
 * Receiving can be recorded against Confirmed or PartiallyReceived orders.
 */
export const canRecordReceiving = (
  order: Pick<PurchaseOrder, "status">,
): boolean => {
  return (
    order.status === "Confirmed" || order.status === "PartiallyReceived"
  );
};

/**
 * Cancellation is allowed for active (non-received, non-cancelled) orders.
 */
export const canCancelPurchaseOrder = (
  order: Pick<PurchaseOrder, "status">,
): boolean => {
  return (
    order.status === "Draft" ||
    order.status === "Confirmed" ||
    order.status === "PartiallyReceived"
  );
};
