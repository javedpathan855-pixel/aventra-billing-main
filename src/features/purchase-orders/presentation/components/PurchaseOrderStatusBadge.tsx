import type { PurchaseOrderStatus } from "../../domain/entities/purchase-order";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<PurchaseOrderStatus, string> = {
  Draft: "bg-text-muted",
  Confirmed: "bg-info",
  PartiallyReceived: "bg-warning",
  Received: "bg-success",
  Cancelled: "bg-text-muted",
};

const statusBadgeClass: Record<PurchaseOrderStatus, string> = {
  Draft: "bg-surface-alt/80 text-text-secondary border-border/80",
  Confirmed: "bg-info/10 text-info border-info/20",
  PartiallyReceived: "bg-warning/10 text-warning border-warning/25",
  Received: "bg-success/10 text-success border-success/25",
  Cancelled: "bg-surface-alt text-text-muted border-border",
};

const statusLabel: Record<PurchaseOrderStatus, string> = {
  Draft: "Draft",
  Confirmed: "Confirmed",
  PartiallyReceived: "Partially Received",
  Received: "Received",
  Cancelled: "Cancelled",
};

export const PurchaseOrderStatusBadge = ({
  status,
}: {
  status: PurchaseOrderStatus;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
      statusBadgeClass[status] || statusBadgeClass.Draft,
    )}
  >
    <span
      className={cn(
        "h-1.5 w-1.5 rounded-full shrink-0",
        statusDotClass[status] || statusDotClass.Draft,
      )}
      aria-hidden="true"
    />
    <span>{statusLabel[status] || status}</span>
  </span>
);
