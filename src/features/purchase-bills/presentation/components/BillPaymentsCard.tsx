import Link from "next/link";
import { ArrowRight, WalletCards } from "lucide-react";
import { formatCurrency } from "@/shared/lib/money";
import type { SupplierPayment } from "@/features/supplier-payments";

export type BillPaymentsCardProps = {
  billId: string;
  billNumber: string;
  billTotal: number;
  supplierId?: string | null;
  payments: SupplierPayment[];
  outstanding: number;
};

/**
 * Supplier payment activity for one purchase bill. Outstanding is always
 * derived from active allocations — never stored — so reversal instantly
 * restores the balance shown here.
 */
export const BillPaymentsCard = ({
  billId: billId,
  billNumber: billNumber,
  billTotal,
  supplierId,
  payments,
  outstanding,
}: BillPaymentsCardProps) => {
  const activePayments = payments.filter((p) => p.status === "Active");
  const paidAmount = Math.round((billTotal - outstanding + Number.EPSILON) * 100) / 100;

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 space-y-4 print:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WalletCards size={18} className="text-primary-light" />
          <h2 className="text-base font-semibold text-text-primary">
            Supplier Payments
          </h2>
        </div>
        {supplierId && (
          <Link
            href={`/supplier-payments/new?supplierId=${supplierId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-light hover:underline"
          >
            Record Payment
            <ArrowRight size={13} />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg border border-border/60 bg-surface-alt/30 p-3">
          <div className="text-text-muted text-[10px] uppercase">Billed</div>
          <div className="font-mono font-medium text-text-primary mt-0.5">
            {formatCurrency(billTotal)}
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface-alt/30 p-3">
          <div className="text-text-muted text-[10px] uppercase">Paid</div>
          <div className="font-mono font-medium text-success mt-0.5">
            {formatCurrency(paidAmount)}
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface-alt/30 p-3">
          <div className="text-text-muted text-[10px] uppercase">Outstanding</div>
          <div className="font-mono font-medium text-info mt-0.5">
            {formatCurrency(outstanding)}
          </div>
        </div>
      </div>

      {activePayments.length === 0 ? (
        <p className="text-xs text-text-muted">
          No active payments recorded against this bill yet.
        </p>
      ) : (
        <div className="space-y-2">
          {activePayments.map((payment) => {
            const applied = payment.allocations
              .filter((line) => line.purchaseBillId === billId)
              .reduce((sum, line) => sum + line.amount, 0);
            return (
              <Link
                key={payment.id}
                href={`/supplier-payments/${payment.id}`}
                className="rounded-lg border border-border/60 bg-surface-alt/30 p-3 flex items-center justify-between gap-3 text-xs hover:border-primary/50 transition-colors"
              >
                <span>
                  <span className="font-medium text-text-primary block">
                    {payment.method} • {payment.paymentDate}
                  </span>
                  <span className="text-text-muted">
                    {billNumber} • Applied {formatCurrency(applied)}
                  </span>
                </span>
                <ArrowRight size={14} className="text-text-muted shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {payments.some((p) => p.status === "Reversed") && (
        <p className="text-[11px] text-text-muted">
          Reversed payments are excluded from paid and outstanding figures.
        </p>
      )}
    </section>
  );
};
