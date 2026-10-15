import {
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  WalletCards,
} from "lucide-react";
import { formatCurrency } from "@/shared/lib/money";
import type { PurchaseSummaryMetrics } from "../../domain/entities/purchase-report";

export type PurchaseReportSummaryCardsProps = {
  summary: PurchaseSummaryMetrics;
  totalOutstanding: number;
};

export const PurchaseReportSummaryCards = ({
  summary,
  totalOutstanding,
}: PurchaseReportSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* 1. Gross Purchases */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Gross Purchases</span>
          <ArrowUpRight size={16} className="text-text-secondary" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {formatCurrency(summary.grossPurchases)}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {summary.billCount} confirmed bill
          {summary.billCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* 2. Purchase Returns */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Purchase Returns</span>
          <ArrowDownRight size={16} className="text-warning" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {formatCurrency(summary.returnsTotal)}
        </div>
        <div className="mt-1 text-xs text-warning">
          {summary.returnCount} completed return
          {summary.returnCount === 1 ? "" : "s"}
        </div>
      </div>

      {/* 3. Net Purchases */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Net Purchases</span>
          <Scale size={16} className="text-primary-light" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {formatCurrency(summary.netPurchases)}
        </div>
        <div className="mt-1 text-xs text-primary-light">
          Gross minus completed returns
        </div>
      </div>

      {/* 4. Outstanding Payables */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Outstanding Payables</span>
          <WalletCards size={16} className="text-info" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {formatCurrency(totalOutstanding)}
        </div>
        <div className="mt-1 text-xs text-info">
          Confirmed bills minus active payments
        </div>
      </div>
    </div>
  );
};
