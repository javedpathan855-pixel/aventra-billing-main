import { CheckCircle2, Clock, ShoppingCart, Truck } from "lucide-react";
import type { PurchaseOrder } from "../../domain/entities/purchase-order";

export type PurchaseOrderSummaryCardsProps = {
  orders: PurchaseOrder[];
  metrics?: {
    totalOrders: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    receivedCount: number;
  };
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export const PurchaseOrderSummaryCards = ({
  orders,
  metrics,
}: PurchaseOrderSummaryCardsProps) => {
  const totalCount = metrics ? metrics.totalOrders : orders.length;
  const totalValue = metrics
    ? metrics.totalAmount
    : orders.reduce((sum, o) => sum + o.total, 0);

  const confirmedCount = metrics
    ? metrics.confirmedCount
    : orders.filter(
        (o) => o.status === "Confirmed" || o.status === "PartiallyReceived",
      ).length;

  const confirmedValue = metrics
    ? metrics.confirmedAmount
    : orders
        .filter(
          (o) => o.status === "Confirmed" || o.status === "PartiallyReceived",
        )
        .reduce((sum, o) => sum + o.total, 0);

  const receivedCount = metrics
    ? metrics.receivedCount
    : orders.filter((o) => o.status === "Received").length;

  const draftCount = orders.filter((o) => o.status === "Draft").length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>All Orders</span>
          <ShoppingCart size={16} className="text-text-secondary" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {totalCount}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {formatCurrency(totalValue)} order value
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Confirmed Orders</span>
          <Clock size={16} className="text-info" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {confirmedCount}
        </div>
        <div className="mt-1 text-xs text-info">
          {formatCurrency(confirmedValue)} confirmed
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Received</span>
          <Truck size={16} className="text-success" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {receivedCount}
        </div>
        <div className="mt-1 text-xs text-success">Goods received</div>
      </div>

      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Drafts</span>
          <CheckCircle2 size={16} className="text-primary-light" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {metrics ? totalCount - confirmedCount - receivedCount : draftCount}
        </div>
        <div className="mt-1 text-xs text-primary-light">Awaiting confirmation</div>
      </div>
    </div>
  );
};
