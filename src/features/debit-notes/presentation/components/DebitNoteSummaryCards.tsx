import { CheckCircle2, FileText, TrendingUp } from "lucide-react";
import type { DebitNoteSummary } from "../../domain/rules/debit-note-filter";
import { formatDebitNoteCurrency } from "../../domain/debit-note";

export const DebitNoteSummaryCards = ({
  summary,
}: {
  summary: DebitNoteSummary;
}) => (
  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
    {/* Total Debit Notes */}
    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <FileText size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Total Debit Notes</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.totalDebitNotes}
        </p>
        <p className="mt-1 text-xs text-text-muted">All recorded documents</p>
      </div>
    </div>

    {/* Total Debited */}
    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <TrendingUp size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Total Debited Value</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {formatDebitNoteCurrency(summary.totalDebitedAmount)}
        </p>
        <p className="mt-1 text-xs text-text-muted">Issued debits</p>
      </div>
    </div>

    {/* Issued Notes */}
    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <CheckCircle2 size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Issued Notes</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.issuedCount}
        </p>
        <p className="mt-1 text-xs text-text-muted tabular-nums">
          {formatDebitNoteCurrency(summary.issuedAmount)}
        </p>
      </div>
    </div>

    {/* Drafts */}
    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <FileText size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Draft Notes</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.draftCount}
        </p>
        <p className="mt-1 text-xs text-text-muted tabular-nums">
          {formatDebitNoteCurrency(summary.draftAmount)}
        </p>
      </div>
    </div>
  </div>
);
