import { CheckCircle2, Clock, FileText, Send } from "lucide-react";
import type { Estimate } from "../../domain/entities/estimate";
import { formatCurrency, resolveEstimateDisplayStatus } from "../../domain/rules/estimate-rules";

export type EstimateSummaryCardsProps = {
  estimates: Estimate[];
};

export const EstimateSummaryCards = ({
  estimates,
}: EstimateSummaryCardsProps) => {
  const totalCount = estimates.length;
  const totalValue = estimates.reduce((sum, e) => {
    const itemTotal = e.items.reduce(
      (s, it) => s + it.quantity * it.unitPrice * (1 - it.discount / 100),
      0,
    );
    return sum + (e.additionalCharges || 0) + itemTotal;
  }, 0);

  const sentCount = estimates.filter((e) => {
    const displayStatus = resolveEstimateDisplayStatus({
      status: e.status,
      validUntil: e.validUntil,
    });
    return displayStatus === "Sent";
  }).length;

  const acceptedCount = estimates.filter(
    (e) => e.status === "Accepted" || e.status === "Converted",
  ).length;

  const expiredCount = estimates.filter((e) => {
    const displayStatus = resolveEstimateDisplayStatus({
      status: e.status,
      validUntil: e.validUntil,
    });
    return displayStatus === "Expired";
  }).length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* 1. Total Estimates */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>All Estimates</span>
          <FileText size={16} className="text-text-secondary" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {totalCount}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {formatCurrency(totalValue)} proposal value
        </div>
      </div>

      {/* 2. Sent / Pending */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Sent &amp; Pending</span>
          <Send size={16} className="text-info" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {sentCount}
        </div>
        <div className="mt-1 text-xs text-info">Awaiting customer decision</div>
      </div>

      {/* 3. Accepted / Converted */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Accepted / Won</span>
          <CheckCircle2 size={16} className="text-success" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {acceptedCount}
        </div>
        <div className="mt-1 text-xs text-success">Ready / converted to invoice</div>
      </div>

      {/* 4. Expired */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Expired</span>
          <Clock size={16} className="text-warning" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {expiredCount}
        </div>
        <div className="mt-1 text-xs text-warning">Past validity period</div>
      </div>
    </div>
  );
};
