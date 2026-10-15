import type { PaymentStatus } from "../../domain/payment";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<PaymentStatus, string> = {
  Active: "bg-success",
  Reversed: "bg-text-muted",
};

const statusBadgeClass: Record<PaymentStatus, string> = {
  Active: "bg-success/10 text-success border-success/25",
  Reversed: "bg-surface-alt/80 text-text-secondary border-border/80",
};

export const PaymentStatusBadge = ({
  status,
}: {
  status: PaymentStatus;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
      statusBadgeClass[status],
    )}
  >
    <span
      className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDotClass[status])}
      aria-hidden="true"
    />
    <span>{status}</span>
  </span>
);
