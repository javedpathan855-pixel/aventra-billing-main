import Link from "next/link";
import { Edit, Eye, ShoppingCart } from "lucide-react";
import type { SalesOrder } from "../../domain/entities/sales-order";
import { SalesOrderStatusBadge } from "./SalesOrderStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type SalesOrderTableProps = {
  orders: SalesOrder[];
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

export const SalesOrderTable = ({ orders }: SalesOrderTableProps) => {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <ShoppingCart size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No sales orders found
        </h3>
        <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
          No sales orders match your search or filters. Create a new confirmed order or convert an accepted quotation to get started.
        </p>
        <div className="mt-6">
          <Link
            href="/sales-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            Create Sales Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/80 bg-surface-alt/40 hover:bg-surface-alt/40">
            <TableHead className="font-semibold text-text-secondary">
              Order #
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Customer
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Order Date
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Delivery Date
            </TableHead>
            <TableHead className="font-semibold text-text-secondary text-right">
              Total Amount
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Fulfilment
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Status
            </TableHead>
            <TableHead className="font-semibold text-text-secondary text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            let totalQty = 0;
            let totalFulfilled = 0;
            for (const it of order.items) {
              totalQty += it.quantity;
              totalFulfilled += it.fulfilledQuantity;
            }
            const progressPct =
              totalQty > 0 ? Math.round((totalFulfilled / totalQty) * 100) : 0;

            return (
              <TableRow
                key={order.id}
                className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
              >
                <TableCell className="font-mono font-medium text-text-primary">
                  <Link
                    href={`/sales-orders/${order.id}`}
                    className="hover:text-primary-light transition-colors"
                  >
                    {order.orderNumber}
                  </Link>
                  {order.referenceNumber && (
                    <div className="text-[11px] font-sans text-text-muted">
                      PO: {order.referenceNumber}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-text-primary">
                    {order.customerName}
                  </div>
                  {order.customerEmail && (
                    <div className="text-xs text-text-secondary truncate max-w-50">
                      {order.customerEmail}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                  {order.orderDate}
                </TableCell>
                <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                  {order.expectedDeliveryDate || "—"}
                </TableCell>
                <TableCell className="text-right font-medium text-text-primary whitespace-nowrap">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-surface-alt rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted font-mono">
                      {progressPct}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <SalesOrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {order.status === "Draft" && (
                      <Link
                        href={`/sales-orders/${order.id}/edit`}
                        className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
                        title="Edit draft order"
                      >
                        <Edit size={15} />
                      </Link>
                    )}
                    <Link
                      href={`/sales-orders/${order.id}`}
                      className="rounded p-1 text-text-muted hover:text-primary-light hover:bg-surface-alt transition-colors"
                      title="View order details"
                    >
                      <Eye size={15} />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
