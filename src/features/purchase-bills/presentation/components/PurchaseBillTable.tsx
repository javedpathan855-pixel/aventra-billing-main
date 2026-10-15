import Link from "next/link";
import { Edit, Eye, ReceiptText } from "lucide-react";
import type { PurchaseBill } from "../../domain/entities/purchase-bill";
import { PurchaseBillStatusBadge } from "./PurchaseBillStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type PurchaseBillTableProps = {
  bills: PurchaseBill[];
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

export const PurchaseBillTable = ({ bills }: PurchaseBillTableProps) => {
  if (bills.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <ReceiptText size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No purchase bills found
        </h3>
        <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
          No purchase bills match your search or filters. Create a new bill
          from a supplier invoice to get started.
        </p>
        <div className="mt-6">
          <Link
            href="/purchase-bills/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            Create Purchase Bill
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
              Bill #
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Supplier
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Bill Date
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Due Date
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
          {bills.map((bill) => (
            <TableRow
              key={bill.id}
              className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
            >
              <TableCell className="font-mono font-medium text-text-primary">
                <Link
                  href={`/purchase-bills/${bill.id}`}
                  className="hover:text-primary-light transition-colors"
                >
                  {bill.billNumber}
                </Link>
                {bill.supplierInvoiceNumber && (
                  <div className="text-[11px] font-sans text-text-muted">
                    Inv: {bill.supplierInvoiceNumber}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium text-text-primary">
                  {bill.supplierName}
                </div>
                {bill.supplierEmail && (
                  <div className="text-xs text-text-secondary truncate max-w-50">
                    {bill.supplierEmail}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                {bill.billDate}
              </TableCell>
              <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                {bill.dueDate}
              </TableCell>
              <TableCell className="text-right font-medium text-text-primary whitespace-nowrap">
                {formatCurrency(bill.total)}
              </TableCell>
              <TableCell>
                <PurchaseBillStatusBadge status={bill.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {bill.status === "Draft" && (
                    <Link
                      href={`/purchase-bills/${bill.id}/edit`}
                      className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
                      title="Edit draft bill"
                    >
                      <Edit size={15} />
                    </Link>
                  )}
                  <Link
                    href={`/purchase-bills/${bill.id}`}
                    className="rounded p-1 text-text-muted hover:text-primary-light hover:bg-surface-alt transition-colors"
                    title="View bill details"
                  >
                    <Eye size={15} />
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
