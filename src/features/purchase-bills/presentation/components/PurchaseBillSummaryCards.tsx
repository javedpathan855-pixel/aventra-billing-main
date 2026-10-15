import { Clock, Pencil, ReceiptText, XCircle } from "lucide-react";
import type { PurchaseBill } from "../../domain/entities/purchase-bill";

export type PurchaseBillSummaryCardsProps = {
  bills: PurchaseBill[];
  metrics?: {
    totalBills: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    cancelledCount: number;
  };
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export const PurchaseBillSummaryCards = ({
  bills,
  metrics,
}: PurchaseBillSummaryCardsProps) => {
  const totalCount = metrics ? metrics.totalBills : bills.length;
  const totalValue = metrics
    ? metrics.totalAmount
    : bills.reduce((sum, b) => sum + b.total, 0);

  const confirmedCount = metrics
    ? metrics.confirmedCount
    : bills.filter((b) => b.status === "Confirmed").length;

  const confirmedValue = metrics
    ? metrics.confirmedAmount
    : bills
        .filter((b) => b.status === "Confirmed")
        .reduce((sum, b) => sum + b.total, 0);

  const cancelledCount = metrics
    ? metrics.cancelledCount
    : bills.filter((b) => b.status === "Cancelled").length;

  const draftCount = metrics
    ? totalCount - confirmedCount - cancelledCount
    : bills.filter((b) => b.status === "Draft").length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* 1. All Bills */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>All Bills</span>
          <ReceiptText size={16} className="text-text-secondary" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {totalCount}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {formatCurrency(totalValue)} billed
        </div>
      </div>

      {/* 2. Confirmed */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Confirmed Bills</span>
          <Clock size={16} className="text-info" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {confirmedCount}
        </div>
        <div className="mt-1 text-xs text-info">
          {formatCurrency(confirmedValue)} confirmed
        </div>
      </div>

      {/* 3. Drafts */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Drafts</span>
          <Pencil size={16} className="text-primary-light" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {draftCount}
        </div>
        <div className="mt-1 text-xs text-primary-light">
          Awaiting confirmation
        </div>
      </div>

      {/* 4. Cancelled */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Cancelled</span>
          <XCircle size={16} className="text-text-muted" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {cancelledCount}
        </div>
        <div className="mt-1 text-xs text-text-secondary">Voided bills</div>
      </div>
    </div>
  );
};
