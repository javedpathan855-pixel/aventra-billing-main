import { Clock, ReceiptText, Undo2, WalletCards } from "lucide-react";
import { formatCurrency } from "../../domain/supplier-payment";
import type { SupplierPayment } from "../../domain/supplier-payment";

export type SupplierPaymentSummaryCardsProps = {
  payments: SupplierPayment[];
  metrics?: {
    totalPayments: number;
    totalAmount: number;
    activeCount: number;
    activeAmount: number;
    reversedCount: number;
    billsCovered: number;
  };
};

export const SupplierPaymentSummaryCards = ({
  payments,
  metrics,
}: SupplierPaymentSummaryCardsProps) => {
  const totalCount = metrics ? metrics.totalPayments : payments.length;
  const totalValue = metrics
    ? metrics.totalAmount
    : payments.reduce((sum, p) => sum + p.amount, 0);

  const activeCount = metrics
    ? metrics.activeCount
    : payments.filter((p) => p.status === "Active").length;

  const activeValue = metrics
    ? metrics.activeAmount
    : payments
        .filter((p) => p.status === "Active")
        .reduce((sum, p) => sum + p.amount, 0);

  const reversedCount = metrics
    ? metrics.reversedCount
    : payments.filter((p) => p.status === "Reversed").length;

  const billsCovered = metrics
    ? metrics.billsCovered
    : new Set(
        payments
          .filter((p) => p.status === "Active")
          .flatMap((p) => p.allocations.map((line) => line.purchaseBillId)),
      ).size;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* 1. All Payments */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>All Payments</span>
          <WalletCards size={16} className="text-text-secondary" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {totalCount}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {formatCurrency(totalValue)} paid
        </div>
      </div>

      {/* 2. Active */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Active Payments</span>
          <Clock size={16} className="text-success" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {activeCount}
        </div>
        <div className="mt-1 text-xs text-success">
          {formatCurrency(activeValue)} applied
        </div>
      </div>

      {/* 3. Reversed */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Reversed</span>
          <Undo2 size={16} className="text-text-muted" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {reversedCount}
        </div>
        <div className="mt-1 text-xs text-text-secondary">Voided payments</div>
      </div>

      {/* 4. Bills Covered */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Bills Covered</span>
          <ReceiptText size={16} className="text-primary-light" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {billsCovered}
        </div>
        <div className="mt-1 text-xs text-primary-light">
          Distinct bills with active payments
        </div>
      </div>
    </div>
  );
};
