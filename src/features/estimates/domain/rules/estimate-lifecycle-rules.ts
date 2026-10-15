import type { Estimate } from "../entities/estimate";

export const canEditEstimate = (estimate: Pick<Estimate, "status">): boolean =>
  estimate.status === "Draft";

export const canSendEstimate = (estimate: Pick<Estimate, "status">): boolean =>
  estimate.status === "Draft";

export const canAcceptEstimate = (
  estimate: Pick<Estimate, "status">,
): boolean => estimate.status === "Sent";

export const canRejectEstimate = (
  estimate: Pick<Estimate, "status">,
): boolean => estimate.status === "Sent";

export const canCancelEstimate = (
  estimate: Pick<Estimate, "status">,
): boolean =>
  estimate.status === "Draft" || estimate.status === "Sent";

export const canReopenEstimate = (
  estimate: Pick<Estimate, "status">,
): boolean =>
  estimate.status === "Rejected" ||
  estimate.status === "Cancelled" ||
  estimate.status === "Expired";

export const canConvertToInvoice = (
  estimate: Pick<Estimate, "status" | "convertedToInvoiceId">,
): boolean => {
  if (estimate.convertedToInvoiceId) return false;
  return estimate.status === "Accepted" || estimate.status === "Sent";
};

export const canDeleteEstimate = (
  estimate: Pick<Estimate, "status">,
): boolean => estimate.status === "Draft";
