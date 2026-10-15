import type { DeliveryChallanStatus } from "../entities/delivery-challan";
import {
  InvalidChallanStatusTransitionError,
  OverDeliveryError,
  DeliveryChallanDomainError,
} from "../errors/delivery-challan-errors";

export const ALLOWED_STATUS_TRANSITIONS: Record<
  DeliveryChallanStatus,
  readonly DeliveryChallanStatus[]
> = {
  DRAFT: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
} as const;

export const canTransitionStatus = (
  current: DeliveryChallanStatus,
  target: DeliveryChallanStatus,
): boolean => {
  if (current === target) return true;
  return ALLOWED_STATUS_TRANSITIONS[current]?.includes(target) ?? false;
};

export const assertValidStatusTransition = (
  current: DeliveryChallanStatus,
  target: DeliveryChallanStatus,
): void => {
  if (!canTransitionStatus(current, target)) {
    throw new InvalidChallanStatusTransitionError(current, target);
  }
};

/**
 * Calculates remaining deliverable quantity for a sales order line.
 * Formula: Math.max(0, orderedQuantity - previouslyDeliveredQuantity)
 */
export const calculateRemainingDeliverableQuantity = (
  orderedQuantity: number,
  previouslyDeliveredQuantity: number,
): number => {
  const remaining = Number((orderedQuantity - previouslyDeliveredQuantity).toFixed(3));
  return Math.max(0, remaining);
};

/**
 * Validates delivery line quantity against remaining deliverable quantity.
 */
export const assertDeliverableQuantity = (
  itemName: string,
  deliveredQuantity: number,
  remainingQuantity: number,
): void => {
  if (deliveredQuantity <= 0) {
    throw new DeliveryChallanDomainError(
      `Delivered quantity for '${itemName}' must be greater than zero.`,
    );
  }

  // Tolerant to small floating point precision differences
  if (deliveredQuantity > remainingQuantity + 0.0001) {
    throw new OverDeliveryError(itemName, deliveredQuantity, remainingQuantity);
  }
};

/**
 * Derives the resulting Sales Order status based on cumulative delivered items.
 */
export const deriveSalesOrderFulfilmentStatus = (
  lines: Array<{ orderedQuantity: number; cumulativeDeliveredQuantity: number }>,
): "CONFIRMED" | "PARTIALLY_FULFILLED" | "FULFILLED" => {
  if (lines.length === 0) return "CONFIRMED";

  let allFulfilled = true;
  let anyDelivered = false;

  for (const line of lines) {
    if (line.cumulativeDeliveredQuantity > 0.0001) {
      anyDelivered = true;
    }
    if (line.cumulativeDeliveredQuantity < line.orderedQuantity - 0.0001) {
      allFulfilled = false;
    }
  }

  if (allFulfilled) return "FULFILLED";
  if (anyDelivered) return "PARTIALLY_FULFILLED";
  return "CONFIRMED";
};
