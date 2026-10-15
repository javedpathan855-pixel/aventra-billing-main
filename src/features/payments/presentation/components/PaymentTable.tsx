import Link from "next/link";
import { Eye } from "lucide-react";
import {
  formatCurrency,
  formatPaymentDate,
  type Payment,
} from "../../domain/payment";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table/Table";

export type PaymentTableProps = {
  payments: Payment[];
};

export const PaymentTable = ({ payments }: PaymentTableProps) => (
  <div className="overflow-hidden rounded-xl border border-border bg-surface-card transition-colors">
    <Table className="min-w-[960px]">
      <TableHeader>
        <TableRow>
          <TableHead className="px-4 py-3.5">Customer</TableHead>
          <TableHead className="px-4 py-3.5">Payment Date</TableHead>
          <TableHead className="px-4 py-3.5">Method</TableHead>
          <TableHead className="px-4 py-3.5">Reference</TableHead>
          <TableHead className="px-4 py-3.5 text-right">Received</TableHead>
          <TableHead className="px-4 py-3.5 text-right">Allocated</TableHead>
          <TableHead className="px-4 py-3.5">Status</TableHead>
          <TableHead className="px-4 py-3.5 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => {
          const allocated = payment.allocations.reduce((sum, line) => sum + line.amount, 0);
          return (
            <TableRow key={payment.id} className="transition-colors hover:bg-surface-alt/40">
              <TableCell className="px-4 py-3.5">
                <p className="font-medium text-text-primary leading-snug">{payment.customerName}</p>
                <p className="text-xs text-text-muted leading-tight mt-0.5">
                  {payment.allocations.length} allocation
                  {payment.allocations.length === 1 ? "" : "s"}
                </p>
              </TableCell>
              <TableCell className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
                {formatPaymentDate(payment.paymentDate)}
              </TableCell>
              <TableCell className="px-4 py-3.5 text-text-secondary whitespace-nowrap">
                {payment.method}
              </TableCell>
              <TableCell className="px-4 py-3.5 text-text-secondary max-w-[160px] truncate">
                <span title={payment.reference ?? ""}>{payment.reference || "—"}</span>
              </TableCell>
              <TableCell className="px-4 py-3.5 text-right font-medium text-text-primary whitespace-nowrap tabular-nums">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell className="px-4 py-3.5 text-right font-medium text-text-primary whitespace-nowrap tabular-nums">
                {formatCurrency(payment.status === "Active" ? allocated : 0)}
              </TableCell>
              <TableCell className="px-4 py-3.5 whitespace-nowrap">
                <PaymentStatusBadge status={payment.status} />
              </TableCell>
              <TableCell className="px-4 py-3.5 text-right whitespace-nowrap">
                <Link
                  href={`/payments/${payment.id}`}
                  aria-label={`View payment from ${payment.customerName}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <Eye size={15} />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);
