import { CheckCircle2, Clock, Pencil, Undo2 } from "lucide-react";
import type { PurchaseReturn } from "../../domain/entities/purchase-return";

export type PurchaseReturnSummaryCardsProps = {
  returns: PurchaseReturn[];
  metrics?: {
    totalReturns: number;
    totalAmount: number;
    approvedCount: number;
    completedCount: number;
    cancelledCount: number;
  };
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export const PurchaseReturnSummaryCards = ({
  returns,
  metrics,
}: PurchaseReturnSummaryCardsProps) => {
  const totalCount = metrics ? metrics.totalReturns : returns.length;
  const totalValue = metrics
    ? metrics.totalAmount
    : returns.reduce((sum, r) => sum + r.totalAmount, 0);

  const approvedCount = metrics
    ? metrics.approvedCount
    : returns.filter((r) => r.status === "APPROVED").length;

  const completedCount = metrics
    ? metrics.completedCount
    : returns.filter((r) => r.status === "COMPLETED").length;

  const cancelledCount = metrics
    ? metrics.cancelledCount
    : returns.filter((r) => r.status === "CANCELLED").length;

  const draftCount = metrics
    ? totalCount - approvedCount - completedCount - cancelledCount
    : returns.filter((r) => r.status === "DRAFT").length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* 1. All Returns */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>All Returns</span>
          <Undo2 size={16} className="text-text-secondary" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {totalCount}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {formatCurrency(totalValue)} returned
        </div>
      </div>

      {/* 2. Approved */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Approved Returns</span>
          <Clock size={16} className="text-info" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {approvedCount}
        </div>
        <div className="mt-1 text-xs text-info">Awaiting dispatch</div>
      </div>

      {/* 3. Completed */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Completed</span>
          <CheckCircle2 size={16} className="text-success" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {completedCount}
        </div>
        <div className="mt-1 text-xs text-success">Goods sent back</div>
      </div>

      {/* 4. Drafts */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Drafts</span>
          <Pencil size={16} className="text-primary-light" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {draftCount}
        </div>
        <div className="mt-1 text-xs text-primary-light">
          Awaiting approval
        </div>
      </div>
    </div>
  );
};
