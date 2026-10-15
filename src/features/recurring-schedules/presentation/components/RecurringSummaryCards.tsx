import { CalendarClock, CheckCircle2, FileText, PauseCircle } from "lucide-react";
import type { RecurringScheduleSummary } from "../../domain/rules/recurring-filter";

export const RecurringSummaryCards = ({
  summary,
}: {
  summary: RecurringScheduleSummary;
}) => (
  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <FileText size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Total Schedules</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.totalSchedules}
        </p>
        <p className="mt-1 text-xs text-text-muted">All recorded schedules</p>
      </div>
    </div>

    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <CheckCircle2 size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Active Schedules</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.activeCount}
        </p>
        <p className="mt-1 text-xs text-text-muted">Billing automatically</p>
      </div>
    </div>

    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <PauseCircle size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Paused Schedules</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.pausedCount}
        </p>
        <p className="mt-1 text-xs text-text-muted">Skipped by the scheduler</p>
      </div>
    </div>

    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <CalendarClock size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Invoices Generated</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.invoicesGenerated}
        </p>
        <p className="mt-1 text-xs text-text-muted">Across all schedules</p>
      </div>
    </div>
  </div>
);
