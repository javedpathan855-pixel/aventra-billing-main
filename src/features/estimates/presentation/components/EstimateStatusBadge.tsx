import type { EstimateStatus } from "../../domain/entities/estimate";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<EstimateStatus, string> = {
  Draft: "bg-text-muted",
  Sent: "bg-info",
  Accepted: "bg-success",
  Rejected: "bg-danger",
  Expired: "bg-warning",
  Converted: "bg-primary-light",
  Cancelled: "bg-text-muted",
};

const statusBadgeClass: Record<EstimateStatus, string> = {
  Draft: "bg-surface-alt/80 text-text-secondary border-border/80",
  Sent: "bg-info/10 text-info border-info/20",
  Accepted: "bg-success/10 text-success border-success/25",
  Rejected: "bg-danger/10 text-danger border-danger/25",
  Expired: "bg-warning/10 text-warning border-warning/25",
  Converted: "bg-primary/10 text-primary-light border-primary/25",
  Cancelled: "bg-surface-alt text-text-muted border-border",
};

export const EstimateStatusBadge = ({
  status,
}: {
  status: EstimateStatus;
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
    <span>{status}</span>
  </span>
);
