import Link from "next/link";
import { ArrowRight, Edit, Eye, FileText } from "lucide-react";
import type { Estimate } from "../../domain/entities/estimate";
import {
  calculateEstimateTotals,
  formatCurrency,
  formatEstimateDate,
  resolveEstimateDisplayStatus,
} from "../../domain/rules/estimate-rules";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type EstimateTableProps = {
  estimates: Estimate[];
};

export const EstimateTable = ({ estimates }: EstimateTableProps) => {
  if (estimates.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <FileText size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No estimates found
        </h3>
        <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
          No estimates or quotations match the selected filters. Create a new quotation proposal to get started.
        </p>
        <div className="mt-6">
          <Link
            href="/estimates/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            Create New Estimate
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
              Estimate #
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Customer
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Quotation Date
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Valid Until
            </TableHead>
            <TableHead className="font-semibold text-text-secondary text-right">
              Total Amount
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
          {estimates.map((estimate) => {
            const displayStatus = resolveEstimateDisplayStatus({
              status: estimate.status,
              validUntil: estimate.validUntil,
            });

            const totals = calculateEstimateTotals({
              items: estimate.items,
              taxMode: estimate.taxMode,
              additionalCharges: estimate.additionalCharges,
              additionalDiscount: estimate.additionalDiscount,
              additionalDiscountType: estimate.additionalDiscountType,
            });

            return (
              <TableRow
                key={estimate.id}
                className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
              >
                <TableCell className="font-mono font-medium text-text-primary">
                  <Link
                    href={`/estimates/${estimate.id}`}
                    className="hover:text-primary-light transition-colors"
                  >
                    {estimate.estimateNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-text-primary">
                    {estimate.customer}
                  </div>
                  {estimate.customerEmail && (
                    <div className="text-xs text-text-muted truncate max-w-xs">
                      {estimate.customerEmail}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                  {formatEstimateDate(estimate.issueDate)}
                </TableCell>
                <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                  {formatEstimateDate(estimate.validUntil)}
                </TableCell>
                <TableCell className="font-mono text-sm text-text-primary text-right font-semibold whitespace-nowrap">
                  {formatCurrency(totals.total)}
                </TableCell>
                <TableCell>
                  <EstimateStatusBadge status={displayStatus} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/estimates/${estimate.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                    >
                      <Eye size={13} />
                      View
                    </Link>

                    {estimate.status === "Draft" && (
                      <Link
                        href={`/estimates/${estimate.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
                      >
                        <Edit size={13} />
                        Edit
                      </Link>
                    )}

                    {estimate.convertedToInvoiceId && (
                      <Link
                        href={`/invoices/${estimate.convertedToInvoiceId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-light hover:text-primary transition-colors"
                      >
                        Invoice
                        <ArrowRight size={12} />
                      </Link>
                    )}
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
