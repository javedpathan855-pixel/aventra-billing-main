import type {
  PurchaseBill,
  PurchaseBillStatus,
} from "../entities/purchase-bill";
import { InvalidPurchaseBillStatusTransitionError } from "../errors/purchase-bill-errors";

/**
 * Valid state transitions for Purchase Bills:
 *
 * Draft -> Confirmed, Cancelled
 * Confirmed -> Cancelled
 * Cancelled -> (Terminal)
 *
 * Confirmation posts the bill and locks it against editing; cancellation
 * preserves history without deleting the document. There is no receiving
 * workflow on bills — goods receipt belongs to Purchase Orders — and no
 * paid status, because supplier payments are managed by a separate,
 * not-yet-implemented workflow.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  PurchaseBillStatus,
  PurchaseBillStatus[]
> = {
  Draft: ["Confirmed", "Cancelled"],
  Confirmed: ["Cancelled"],
  Cancelled: [],
};

export const canTransitionPurchaseBillStatus = (
  from: PurchaseBillStatus,
  to: PurchaseBillStatus,
): boolean => {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
};

export const validatePurchaseBillStatusTransition = (
  currentStatus: PurchaseBillStatus,
  targetStatus: PurchaseBillStatus,
): void => {
  if (!canTransitionPurchaseBillStatus(currentStatus, targetStatus)) {
    throw new InvalidPurchaseBillStatusTransitionError(
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
 * Editing line items and bill fields is strictly permitted only in Draft status.
 */
export const canEditPurchaseBill = (
  bill: Pick<PurchaseBill, "status">,
): boolean => {
  return bill.status === "Draft";
};

/**
 * Deleting a purchase bill is permitted only when it is a Draft.
 */
export const canDeletePurchaseBill = (
  bill: Pick<PurchaseBill, "status">,
): boolean => {
  return bill.status === "Draft";
};

/**
 * Confirming a purchase bill posts it and locks it against casual draft
 * editing.
 */
export const canConfirmPurchaseBill = (
  bill: Pick<PurchaseBill, "status">,
): boolean => {
  return bill.status === "Draft";
};

/**
 * Cancellation is allowed for non-terminal bills.
 */
export const canCancelPurchaseBill = (
  bill: Pick<PurchaseBill, "status">,
): boolean => {
  return bill.status === "Draft" || bill.status === "Confirmed";
};
