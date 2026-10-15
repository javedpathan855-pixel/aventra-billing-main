import type { RecurringOccurrenceStatus } from "../../domain/recurring-schedule";
import { cn } from "@/shared/utils/cn";

const statusClass: Record<RecurringOccurrenceStatus, string> = {
  Pending: "bg-surface-alt/80 text-text-secondary border-border/80",
  Processing: "bg-primary/10 text-primary-light border-primary/25",
  Succeeded: "bg-success/10 text-success border-success/25",
  Failed: "bg-danger/10 text-danger border-danger/25",
};

export const OccurrenceStatusBadge = ({
  status,
}: {
  status: RecurringOccurrenceStatus;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
      statusClass[status],
    )}
  >
    <span>{status}</span>
  </span>
);
