import Link from "next/link";
import { Eye, Undo2 } from "lucide-react";
import type { PurchaseReturn } from "../../domain/entities/purchase-return";
import { PurchaseReturnStatusBadge } from "./PurchaseReturnStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type PurchaseReturnTableProps = {
  returns: PurchaseReturn[];
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

export const PurchaseReturnTable = ({ returns }: PurchaseReturnTableProps) => {
  if (returns.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <Undo2 size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No purchase returns found
        </h3>
        <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
          No purchase returns match your search or filters. Create a new
          return from a posted purchase bill to get started.
        </p>
        <div className="mt-6">
          <Link
            href="/purchase-returns/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            Create Purchase Return
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
              Supplier
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Return Date
            </TableHead>
            <TableHead className="font-semibold text-text-secondary text-right">
              Return Amount
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
          {returns.map((purchaseReturn) => (
            <TableRow
              key={purchaseReturn.id}
              className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
            >
              <TableCell className="font-mono font-medium text-text-primary">
                <Link
                  href={`/purchase-returns/${purchaseReturn.id}`}
                  className="hover:text-primary-light transition-colors"
                >
                  {purchaseReturn.returnNumber}
                </Link>
                {purchaseReturn.purchaseBillNumber && (
                  <div className="text-[11px] font-sans text-text-muted">
                    Bill: {purchaseReturn.purchaseBillNumber}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="font-medium text-text-primary">
                  {purchaseReturn.supplierName}
                </div>
                <div className="text-xs text-text-secondary truncate max-w-50">
                  {purchaseReturn.reason}
                </div>
              </TableCell>
              <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                {purchaseReturn.returnDate}
              </TableCell>
              <TableCell className="text-right font-medium text-text-primary whitespace-nowrap">
                {formatCurrency(purchaseReturn.totalAmount)}
              </TableCell>
              <TableCell>
                <PurchaseReturnStatusBadge status={purchaseReturn.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/purchase-returns/${purchaseReturn.id}`}
                    className="rounded p-1 text-text-muted hover:text-primary-light hover:bg-surface-alt transition-colors"
                    title="View return details"
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
