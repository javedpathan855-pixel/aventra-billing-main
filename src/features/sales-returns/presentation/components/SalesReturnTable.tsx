import Link from "next/link";
import { Eye, Undo2 } from "lucide-react";
import type { SalesReturn } from "../../domain/entities/sales-return";
import { SalesReturnStatusBadge } from "./SalesReturnStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type SalesReturnTableProps = {
  returns: SalesReturn[];
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

export const SalesReturnTable = ({ returns }: SalesReturnTableProps) => {
  if (returns.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <Undo2 size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No sales returns found
        </h3>
        <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
          No return authorizations match your search or filter criteria. Create a return against an invoiced sale to begin.
        </p>
        <div className="mt-6">
          <Link
            href="/sales-returns/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            Create Sales Return
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
              Return #
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Customer
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Invoice #
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Credit Note
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Return Date
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
          {returns.map((ret) => {
            const formattedDate = new Date(ret.returnDate).toLocaleDateString(
              "en-IN",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              },
            );

            return (
              <TableRow
                key={ret.id}
                className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
              >
                <TableCell className="font-mono font-medium text-text-primary">
                  <Link
                    href={`/sales-returns/${ret.id}`}
                    className="hover:text-primary-light transition-colors"
                  >
                    {ret.returnNumber}
                  </Link>
                  <div className="text-[11px] font-sans text-text-muted truncate max-w-44">
                    {ret.reason}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-text-primary">
                    {ret.customerName}
                  </div>
                  {ret.customerAddress && (
                    <div className="text-xs text-text-secondary truncate max-w-50">
                      {ret.customerAddress}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm font-mono text-text-secondary">
                  {ret.invoiceNumber ? (
                    <Link
                      href={`/invoices/${ret.invoiceId}`}
                      className="hover:text-primary-light transition-colors"
                    >
                      {ret.invoiceNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm font-mono text-text-secondary">
                  {ret.creditNoteNumber ? (
                    <Link
                      href={`/credit-notes/${ret.creditNoteId}`}
                      className="text-info hover:underline transition-colors"
                    >
                      {ret.creditNoteNumber}
                    </Link>
                  ) : (
                    <span className="text-text-muted">Not Issued</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                  {formattedDate}
                </TableCell>
                <TableCell className="text-right font-medium text-text-primary whitespace-nowrap">
                  {formatCurrency(ret.totalAmount)}
                </TableCell>
                <TableCell>
                  <SalesReturnStatusBadge status={ret.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/sales-returns/${ret.id}`}
                      className="rounded p-1 text-text-muted hover:text-primary-light hover:bg-surface-alt transition-colors"
                      title="View return details"
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
