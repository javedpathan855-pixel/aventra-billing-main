import type { PurchaseBillStatus } from "../../domain/entities/purchase-bill";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<PurchaseBillStatus, string> = {
  Draft: "bg-text-muted",
  Confirmed: "bg-info",
  Cancelled: "bg-text-muted",
};

const statusBadgeClass: Record<PurchaseBillStatus, string> = {
  Draft: "bg-surface-alt/80 text-text-secondary border-border/80",
  Confirmed: "bg-info/10 text-info border-info/20",
  Cancelled: "bg-surface-alt text-text-muted border-border",
};

const statusLabel: Record<PurchaseBillStatus, string> = {
  Draft: "Draft",
  Confirmed: "Confirmed",
  Cancelled: "Cancelled",
};

export const PurchaseBillStatusBadge = ({
  status,
}: {
  status: PurchaseBillStatus;
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
