import { CheckCircle2, Clock, ShoppingCart, Truck } from "lucide-react";
import type { SalesOrder } from "../../domain/entities/sales-order";

export type SalesOrderSummaryCardsProps = {
  orders: SalesOrder[];
  metrics?: {
    totalOrders: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    fulfilledCount: number;
    invoicedCount: number;
  };
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);

export const SalesOrderSummaryCards = ({
  orders,
  metrics,
}: SalesOrderSummaryCardsProps) => {
  const totalCount = metrics ? metrics.totalOrders : orders.length;
  const totalValue = metrics
    ? metrics.totalAmount
    : orders.reduce((sum, o) => sum + o.total, 0);

  const confirmedCount = metrics
    ? metrics.confirmedCount
    : orders.filter((o) => o.status === "Confirmed" || o.status === "PartiallyFulfilled")
        .length;

  const confirmedValue = metrics
    ? metrics.confirmedAmount
    : orders
        .filter((o) => o.status === "Confirmed" || o.status === "PartiallyFulfilled")
        .reduce((sum, o) => sum + o.total, 0);

  const fulfilledCount = metrics
    ? metrics.fulfilledCount
    : orders.filter((o) => o.status === "Fulfilled").length;

  const invoicedCount = metrics
    ? metrics.invoicedCount
    : orders.filter((o) => o.invoices && o.invoices.length > 0).length;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* 1. All Orders */}
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

      {/* 2. Confirmed & In Progress */}
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

      {/* 3. Fully Fulfilled */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Fulfilled</span>
          <Truck size={16} className="text-success" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {fulfilledCount}
        </div>
        <div className="mt-1 text-xs text-success">Delivery completed</div>
      </div>

      {/* 4. Invoiced */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Invoiced</span>
          <CheckCircle2 size={16} className="text-primary-light" />
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight text-text-primary">
          {invoicedCount}
        </div>
        <div className="mt-1 text-xs text-primary-light">Invoices generated</div>
      </div>
    </div>
  );
};
