import type { RecurringScheduleStatus } from "../../domain/recurring-schedule";
import { cn } from "@/shared/utils/cn";

const statusDotClass: Record<RecurringScheduleStatus, string> = {
  Active: "bg-success",
  Paused: "bg-text-muted",
  Completed: "bg-primary-light",
  Cancelled: "bg-danger",
};

const statusBadgeClass: Record<RecurringScheduleStatus, string> = {
  Active: "bg-success/10 text-success border-success/25",
  Paused: "bg-surface-alt/80 text-text-secondary border-border/80",
  Completed: "bg-primary/10 text-primary-light border-primary/25",
  Cancelled: "bg-danger/10 text-danger border-danger/25",
};

export const RecurringStatusBadge = ({
  status,
}: {
  status: RecurringScheduleStatus;
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
