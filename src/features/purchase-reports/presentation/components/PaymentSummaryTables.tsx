import { formatCurrency } from "@/shared/lib/money";
import type { PaymentSummary } from "../../domain/entities/purchase-report";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type PaymentSummaryTablesProps = {
  payments: PaymentSummary;
};

export const PaymentSummaryTables = ({ payments }: PaymentSummaryTablesProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Supplier Payments
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Active payments only; reversed payments are excluded.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-mono text-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(payments.totalPaid)}
          </div>
          <div className="text-[11px] text-text-muted">
            across {payments.paymentCount} payment
            {payments.paymentCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            By Method
          </h3>
          {payments.byMethod.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
              No payments in scope.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-surface-alt/40 hover:bg-surface-alt/40">
                    <TableHead className="font-semibold text-text-secondary">
                      Method
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
                  {payments.byMethod.map((row) => (
                    <TableRow
                      key={row.method}
                      className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
                    >
                      <TableCell className="font-medium text-text-primary">
                        {row.method}
                      </TableCell>
                      <TableCell className="text-right font-mono text-text-secondary">
                        {row.paymentCount}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-text-primary whitespace-nowrap">
                        {formatCurrency(row.totalPaid)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            By Supplier
          </h3>
          {payments.bySupplier.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
              No payments in scope.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-surface-alt/40 hover:bg-surface-alt/40">
                    <TableHead className="font-semibold text-text-secondary">
                      Supplier
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
                  {payments.bySupplier.map((row) => (
                    <TableRow
                      key={row.supplierId || "unknown"}
                      className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
                    >
                      <TableCell className="font-medium text-text-primary">
                        {row.supplierName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-text-secondary">
                        {row.paymentCount}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-text-primary whitespace-nowrap">
                        {formatCurrency(row.totalPaid)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
