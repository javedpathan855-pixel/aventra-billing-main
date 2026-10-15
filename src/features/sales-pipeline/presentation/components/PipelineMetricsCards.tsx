import React from "react";
import type { OpportunityMetrics } from "../../domain/entities/sales-opportunity";
import { formatCurrency } from "@/shared/lib/money";
import { DollarSign, Target, Award, ClockAlert } from "lucide-react";
import { cn } from "@/shared/utils/cn";

export interface PipelineMetricsCardsProps {
  metrics: OpportunityMetrics;
}

export const PipelineMetricsCards = ({
  metrics,
}: PipelineMetricsCardsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Active Pipeline */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-hover">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-muted">Total Pipeline</p>
          <div className="rounded-lg bg-info/10 p-2 text-info">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
          {formatCurrency(metrics.totalPipelineValue)}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
          <span className="font-semibold text-text-primary">{metrics.openCount}</span> active deals
        </div>
      </div>

      {/* Weighted Forecast */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-hover">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-muted">Weighted Forecast</p>
          <div className="rounded-lg bg-info/10 p-2 text-info">
            <Target className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
          {formatCurrency(metrics.weightedPipelineValue)}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Probability-adjusted expected revenue
        </p>
      </div>

      {/* Win Rate */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-hover">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-muted">Win Rate</p>
          <div className="rounded-lg bg-success/10 p-2 text-success">
            <Award className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-success">
          {metrics.winRate}%
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
          <span>{metrics.wonCount} won</span>
          <span>•</span>
          <span>{metrics.lostCount} lost</span>
        </div>
      </div>

      {/* Overdue Follow-ups */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-hover">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-text-muted">Follow-up Alerts</p>
          <div
            className={cn(
              "rounded-lg p-2",
              metrics.overdueFollowUpsCount > 0
                ? "bg-danger/10 text-danger"
                : "bg-surface-alt text-text-muted",
            )}
          >
            <ClockAlert className="h-4 w-4" />
          </div>
        </div>
        <p
          className={cn(
            "mt-2 text-2xl font-bold tracking-tight",
            metrics.overdueFollowUpsCount > 0 ? "text-danger" : "text-text-primary",
          )}
        >
          {metrics.overdueFollowUpsCount}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {metrics.overdueFollowUpsCount > 0
            ? "Deals requiring immediate attention"
            : "All follow-ups up to date"}
        </p>
      </div>
    </div>
  );
};
