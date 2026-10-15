import type { DeliveryChallanStatus } from "../../domain/entities/delivery-challan";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<DeliveryChallanStatus, string> = {
  DRAFT: "bg-text-muted",
  DISPATCHED: "bg-warning",
  DELIVERED: "bg-success",
  CANCELLED: "bg-text-muted",
};

const statusBadgeClass: Record<DeliveryChallanStatus, string> = {
  DRAFT: "bg-surface-alt/80 text-text-secondary border-border/80",
  DISPATCHED: "bg-warning/10 text-warning border-warning/25",
  DELIVERED: "bg-success/10 text-success border-success/25",
  CANCELLED: "bg-surface-alt text-text-muted border-border",
};

const statusLabel: Record<DeliveryChallanStatus, string> = {
  DRAFT: "Draft",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const DeliveryChallanStatusBadge = ({
  status,
}: {
  status: DeliveryChallanStatus;
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
