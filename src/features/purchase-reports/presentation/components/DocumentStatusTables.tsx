import { formatCurrency } from "@/shared/lib/money";
import type {
  OrderSummary,
  ReturnSummary,
} from "../../domain/entities/purchase-report";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type DocumentStatusTablesProps = {
  orders: OrderSummary;
  returns: ReturnSummary;
};

const StatusTable = ({
  title,
  subtitle,
  rows,
  totalLabel,
  totalValue,
}: {
  title: string;
  subtitle: string;
  rows: { status: string; count: number; total: number }[];
  totalLabel: string;
  totalValue: number;
}) => (
  <div>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
      {title}
    </h3>
    <p className="mb-2 text-[11px] text-text-muted">{subtitle}</p>
    {rows.length === 0 ? (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
        No documents in scope.
      </div>
    ) : (
      <div className="overflow-hidden rounded-xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/80 bg-surface-alt/40 hover:bg-surface-alt/40">
              <TableHead className="font-semibold text-text-secondary">
                Status
              </TableHead>
              <TableHead className="font-semibold text-text-secondary text-right">
                Count
              </TableHead>
              <TableHead className="font-semibold text-text-secondary text-right">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.status}
                className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
              >
                <TableCell className="font-medium text-text-primary">
                  {row.status}
                </TableCell>
                <TableCell className="text-right font-mono text-text-secondary">
                  {row.count}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-text-primary whitespace-nowrap">
                  {formatCurrency(row.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border/60 bg-surface-alt/30 px-3 py-2.5 text-xs">
          <span className="font-medium text-text-secondary">{totalLabel}</span>
          <span className="font-mono font-semibold text-text-primary tabular-nums">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>
    )}
  </div>
);

export const DocumentStatusTables = ({
  orders,
  returns,
}: DocumentStatusTablesProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Orders &amp; Returns by Status
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Document counts and totals grouped by lifecycle status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <StatusTable
          title="Purchase Orders"
          subtitle="All order statuses in scope."
          rows={orders.rows}
          totalLabel={`${orders.totalOrders} orders`}
          totalValue={orders.totalAmount}
        />
        <StatusTable
          title="Purchase Returns"
          subtitle="All return statuses in scope."
          rows={returns.rows}
          totalLabel={`${returns.returnCount} returns`}
          totalValue={returns.returnsTotal}
        />
      </div>
    </section>
  );
};
