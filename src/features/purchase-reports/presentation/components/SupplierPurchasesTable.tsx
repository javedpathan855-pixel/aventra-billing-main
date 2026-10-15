import Link from "next/link";
import { formatCurrency } from "@/shared/lib/money";
import type { SupplierPurchaseRow } from "../../domain/entities/purchase-report";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type SupplierPurchasesTableProps = {
  rows: SupplierPurchaseRow[];
};

export const SupplierPurchasesTable = ({
  rows,
}: SupplierPurchasesTableProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Purchases by Supplier
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Confirmed bills and completed returns per supplier, with current
          outstanding balances.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-muted">
          No supplier activity matches the selected filters.
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
                  Bills
                </TableHead>
                <TableHead className="font-semibold text-text-secondary text-right">
                  Gross
                </TableHead>
                <TableHead className="font-semibold text-text-secondary text-right">
                  Returns
                </TableHead>
                <TableHead className="font-semibold text-text-secondary text-right">
                  Net
                </TableHead>
                <TableHead className="font-semibold text-text-secondary text-right">
                  Outstanding
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.supplierId || "unknown"}
                  className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
                >
                  <TableCell>
                    {row.supplierId ? (
                      <Link
                        href={`/suppliers/${row.supplierId}`}
                        className="font-medium text-text-primary hover:text-primary-light transition-colors"
                      >
                        {row.supplierName}
                      </Link>
                    ) : (
                      <span className="font-medium text-text-primary">
                        {row.supplierName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-text-secondary">
                    {row.billCount}
                  </TableCell>
                  <TableCell className="text-right font-mono text-text-primary whitespace-nowrap">
                    {formatCurrency(row.grossPurchases)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-text-secondary whitespace-nowrap">
                    {formatCurrency(row.returnsTotal)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-text-primary whitespace-nowrap">
                    {formatCurrency(row.netPurchases)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-info whitespace-nowrap">
                    {formatCurrency(row.outstanding)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
};
