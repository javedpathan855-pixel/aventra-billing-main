import type { SalesReturnStatus } from "../entities/sales-return";
import {
  InvalidReturnStatusTransitionError,
  OverReceiptError,
  OverReturnError,
  SalesReturnDomainError,
} from "../errors/sales-return-errors";

export const ALLOWED_RETURN_STATUS_TRANSITIONS: Record<
  SalesReturnStatus,
  readonly SalesReturnStatus[]
> = {
  DRAFT: ["APPROVED", "CANCELLED"],
  APPROVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
} as const;

export const canTransitionReturnStatus = (
  current: SalesReturnStatus,
  target: SalesReturnStatus,
): boolean => {
  if (current === target) return true;
  return ALLOWED_RETURN_STATUS_TRANSITIONS[current]?.includes(target) ?? false;
};

export const assertValidReturnStatusTransition = (
  current: SalesReturnStatus,
  target: SalesReturnStatus,
): void => {
  if (!canTransitionReturnStatus(current, target)) {
    throw new InvalidReturnStatusTransitionError(current, target);
  }
};

export const calculateRemainingReturnableQuantity = (
  soldQuantity: number,
  previouslyReturnedQuantity: number,
): number => {
  const remaining = Number((soldQuantity - previouslyReturnedQuantity).toFixed(3));
  return Math.max(0, remaining);
};

export const assertReturnableQuantity = (
  itemName: string,
  returnQuantity: number,
  remainingQuantity: number,
): void => {
  if (returnQuantity <= 0) {
    throw new SalesReturnDomainError(
      `Return quantity for '${itemName}' must be greater than zero.`,
    );
  }

  if (returnQuantity > remainingQuantity + 0.0001) {
    throw new OverReturnError(itemName, returnQuantity, remainingQuantity);
  }
};

export const assertReceivableQuantity = (
  itemName: string,
  receivedQuantity: number,
  returnQuantity: number,
): void => {
  if (receivedQuantity < 0) {
    throw new SalesReturnDomainError(
      `Received quantity for '${itemName}' cannot be negative.`,
    );
  }

  if (receivedQuantity > returnQuantity + 0.0001) {
    throw new OverReceiptError(itemName, receivedQuantity, returnQuantity);
  }
};

export const calculateReturnLineTotals = (line: {
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

export const calculateReturnTotals = (
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
    const totals = calculateReturnLineTotals({
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
