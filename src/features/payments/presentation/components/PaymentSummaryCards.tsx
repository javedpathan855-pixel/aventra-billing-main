import { Banknote, CheckCircle2, FileText, Undo2 } from "lucide-react";
import type { PaymentSummary } from "../../domain/rules/payment-filter";
import { formatCurrency } from "../../domain/payment";

export const PaymentSummaryCards = ({
  summary,
}: {
  summary: PaymentSummary;
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
        <p className="text-xs font-medium text-text-secondary">Total Payments</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.totalPayments}
        </p>
        <p className="mt-1 text-xs text-text-muted">All recorded receipts</p>
      </div>
    </div>

    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <Banknote size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Total Received Value</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {formatCurrency(summary.totalReceived)}
        </p>
        <p className="mt-1 text-xs text-text-muted">Active payments</p>
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
        <p className="text-xs font-medium text-text-secondary">Active Payments</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.activeCount}
        </p>
        <p className="mt-1 text-xs text-text-muted tabular-nums">
          {formatCurrency(summary.activeAmount)}
        </p>
      </div>
    </div>

    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-card p-4 sm:p-5 transition-colors">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
        aria-hidden="true"
      >
        <Undo2 size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-secondary">Reversed</p>
        <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">
          {summary.reversedCount}
        </p>
        <p className="mt-1 text-xs text-text-muted tabular-nums">Preserved for audit</p>
      </div>
    </div>
  </div>
);
