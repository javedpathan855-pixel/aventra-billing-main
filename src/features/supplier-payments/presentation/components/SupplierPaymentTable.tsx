import Link from "next/link";
import { Eye, WalletCards } from "lucide-react";
import { formatCurrency } from "../../domain/supplier-payment";
import type { SupplierPayment } from "../../domain/supplier-payment";
import { SupplierPaymentStatusBadge } from "./SupplierPaymentStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";

export type SupplierPaymentTableProps = {
  payments: SupplierPayment[];
};

export const SupplierPaymentTable = ({ payments }: SupplierPaymentTableProps) => {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-alt text-text-muted">
          <WalletCards size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No supplier payments found
        </h3>
        <p className="mt-1 text-sm text-text-secondary max-w-sm mx-auto">
          No supplier payments match your search or filters. Record a payment
          against posted purchase bills to get started.
        </p>
        <div className="mt-6">
          <Link
            href="/supplier-payments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light"
          >
            Record Supplier Payment
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
              Supplier
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Payment Date
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Method
            </TableHead>
            <TableHead className="font-semibold text-text-secondary">
              Bills
            </TableHead>
            <TableHead className="font-semibold text-text-secondary text-right">
              Amount
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
          {payments.map((payment) => (
            <TableRow
              key={payment.id}
              className="border-b border-border/60 hover:bg-surface-alt/50 transition-colors"
            >
              <TableCell>
                <div className="font-medium text-text-primary">
                  {payment.supplierName}
                </div>
                {payment.reference && (
                  <div className="text-xs text-text-secondary truncate max-w-50">
                    Ref: {payment.reference}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                {payment.paymentDate}
              </TableCell>
              <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                {payment.method}
              </TableCell>
              <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                {payment.allocations.length} bill
                {payment.allocations.length === 1 ? "" : "s"}
              </TableCell>
              <TableCell className="text-right font-medium text-text-primary whitespace-nowrap">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell>
                <SupplierPaymentStatusBadge status={payment.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/supplier-payments/${payment.id}`}
                    className="rounded p-1 text-text-muted hover:text-primary-light hover:bg-surface-alt transition-colors"
                    title="View payment details"
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
