import type { PurchaseReturnStatus } from "../entities/purchase-return";
import {
  InvalidPurchaseReturnStatusTransitionError,
  OverReturnError,
  PurchaseReturnDomainError,
} from "../errors/purchase-return-errors";

export const ALLOWED_PURCHASE_RETURN_STATUS_TRANSITIONS: Record<
  PurchaseReturnStatus,
  readonly PurchaseReturnStatus[]
> = {
  DRAFT: ["APPROVED", "CANCELLED"],
  APPROVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
} as const;

/**
 * A return moves Draft → Approved → Completed (goods dispatched back to the
 * supplier). There is no second receipt step and no auto-generated credit
 * document: no supplier-side credit model exists, and no stock model exists
 * to post inventory effects against. Dispositions classify lines only.
 */
export const canTransitionPurchaseReturnStatus = (
  current: PurchaseReturnStatus,
  target: PurchaseReturnStatus,
): boolean => {
  if (current === target) return true;
  return (
    ALLOWED_PURCHASE_RETURN_STATUS_TRANSITIONS[current]?.includes(target) ??
    false
  );
};

export const assertValidPurchaseReturnStatusTransition = (
  current: PurchaseReturnStatus,
  target: PurchaseReturnStatus,
): void => {
  if (!canTransitionPurchaseReturnStatus(current, target)) {
    throw new InvalidPurchaseReturnStatusTransitionError(current, target);
  }
};

export const canDeletePurchaseReturn = (
  status: PurchaseReturnStatus,
): boolean => status === "DRAFT";

export const assertDeletablePurchaseReturnStatus = (
  returnNumber: string,
  status: PurchaseReturnStatus,
): void => {
  if (!canDeletePurchaseReturn(status)) {
    throw new PurchaseReturnDomainError(
      `Cannot delete purchase return "${returnNumber}" in '${status}' status. Only Draft returns may be deleted.`,
    );
  }
};

export const getTodayDateString = (): string =>
  new Date().toISOString().split("T")[0];

export const calculateRemainingReturnableQuantity = (
  billedQuantity: number,
  previouslyReturnedQuantity: number,
): number => {
  const remaining = Number(
    (billedQuantity - previouslyReturnedQuantity).toFixed(3),
  );
  return Math.max(0, remaining);
};

export const assertReturnableQuantity = (
  itemName: string,
  returnQuantity: number,
  remainingQuantity: number,
): void => {
  if (returnQuantity <= 0) {
    throw new PurchaseReturnDomainError(
      `Return quantity for '${itemName}' must be greater than zero.`,
    );
  }

  if (returnQuantity > remainingQuantity + 0.0001) {
    throw new OverReturnError(itemName, returnQuantity, remainingQuantity);
  }
};

export const calculatePurchaseReturnLineTotals = (line: {
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}) => {
  const discountRate = line.discount || 0;
  const taxRate = line.taxRate || 0;

  const basePrice = line.quantity * line.unitPrice;
  const discountAmount = Number(((basePrice * discountRate) / 100).toFixed(2));
  const taxableAmount = Number((basePrice - discountAmount).toFixed(2));
  const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
  const lineTotal = Number((taxableAmount + taxAmount).toFixed(2));

  return {
    taxableAmount,
    taxAmount,
    lineTotal,
  };
};

export const calculatePurchaseReturnTotals = (
  items: Array<{
    returnQuantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
  }>,
) => {
  let subtotal = 0;
  let taxAmount = 0;

  for (const item of items) {
    const totals = calculatePurchaseReturnLineTotals({
      quantity: item.returnQuantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxRate: item.taxRate,
    });
    subtotal += totals.taxableAmount;
    taxAmount += totals.taxAmount;
  }

  const roundedSubtotal = Number(subtotal.toFixed(2));
  const roundedTaxAmount = Number(taxAmount.toFixed(2));
  const totalAmount = Number((roundedSubtotal + roundedTaxAmount).toFixed(2));

  return {
    subtotal: roundedSubtotal,
    taxAmount: roundedTaxAmount,
    totalAmount,
  };
};
