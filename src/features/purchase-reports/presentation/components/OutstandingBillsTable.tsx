import Link from "next/link";
import { formatCurrency } from "@/shared/lib/money";
import type { OutstandingPayables } from "../../domain/entities/purchase-report";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type OutstandingBillsTableProps = {
  outstanding: OutstandingPayables;
};

export const OutstandingBillsTable = ({
  outstanding,
}: OutstandingBillsTableProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Outstanding Payables
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Confirmed bills with a remaining balance: bill total minus active
            payment allocations. Returns do not reduce outstanding balances.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-mono text-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(outstanding.totalOutstanding)}
          </div>
          <div className="text-[11px] text-text-muted">
            across {outstanding.billCount} bill
            {outstanding.billCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {outstanding.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-muted">
          Nothing outstanding. Every confirmed bill in scope is fully paid.
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-surface-alt/40 hover:bg-surface-alt/40">
                  <TableHead className="font-semibold text-text-secondary">
                    Bill #
                  </TableHead>
                  <TableHead className="font-semibold text-text-secondary">
                    Supplier
                  </TableHead>
                  <TableHead className="font-semibold text-text-secondary">
                    Due Date
                  </TableHead>
                  <TableHead className="font-semibold text-text-secondary text-right">
                    Total
                  </TableHead>
                  <TableHead className="font-semibold text-text-secondary text-right">
                    Paid
                  </TableHead>
                  <TableHead className="font-semibold text-text-secondary text-right">
                    Outstanding
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstanding.rows.map((row) => (
                  <TableRow
                    key={row.billId}
                    className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
                  >
                    <TableCell className="font-mono font-medium text-text-primary">
                      <Link
                        href={`/purchase-bills/${row.billId}`}
                        className="hover:text-primary-light transition-colors"
                      >
                        {row.billNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-text-primary">
                      {row.supplierName}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                      {row.dueDate}
                    </TableCell>
                    <TableCell className="text-right font-mono text-text-secondary whitespace-nowrap">
                      {formatCurrency(row.total)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-text-secondary whitespace-nowrap">
                      {formatCurrency(row.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-info whitespace-nowrap">
                      {formatCurrency(row.outstanding)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {outstanding.truncated && (
            <p className="text-[11px] text-text-muted">
              Showing the {outstanding.rows.length} most overdue of{" "}
              {outstanding.billCount} outstanding bills. Totals cover all rows.
            </p>
          )}
        </>
      )}
    </section>
  );
};
