import type { PurchaseReturnStatus } from "../../domain/entities/purchase-return";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<PurchaseReturnStatus, string> = {
  DRAFT: "bg-text-muted",
  APPROVED: "bg-info",
  COMPLETED: "bg-success",
  CANCELLED: "bg-text-muted",
};

const statusBadgeClass: Record<PurchaseReturnStatus, string> = {
  DRAFT: "bg-surface-alt/80 text-text-secondary border-border/80",
  APPROVED: "bg-info/10 text-info border-info/20",
  COMPLETED: "bg-success/10 text-success border-success/25",
  CANCELLED: "bg-surface-alt text-text-muted border-border",
};

const statusLabel: Record<PurchaseReturnStatus, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PurchaseReturnStatusBadge = ({
  status,
}: {
  status: PurchaseReturnStatus;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
      statusBadgeClass[status] || statusBadgeClass.DRAFT,
    )}
  >
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full shrink-0",
        statusDotClass[status] || statusDotClass.DRAFT,
      )}
      aria-hidden="true"
    />
    <span>{statusLabel[status] || status}</span>
  </span>
);
