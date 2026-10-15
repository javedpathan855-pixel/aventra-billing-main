import type { SupplierPayment } from "../../domain/supplier-payment";
import { formatCurrency } from "../../domain/supplier-payment";

export type SupplierPaymentDocumentProps = {
  payment: SupplierPayment;
  organizationName?: string;
};

/**
 * Read-only printable supplier payment receipt.
 */
export const SupplierPaymentDocument = ({
  payment,
  organizationName,
}: SupplierPaymentDocumentProps) => {
  const allocated = payment.allocations.reduce(
    (sum, line) => sum + line.amount,
    0,
  );

  return (
    <article className="rounded-2xl border border-border bg-doc-paper p-6 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-text-muted">
            {organizationName || "Aventra Billing"}
          </div>
          <h2 className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-text-primary">
            {formatCurrency(payment.amount)}
          </h2>
          <div className="mt-1 text-xs text-text-secondary">
            Paid on {payment.paymentDate} via {payment.method}
          </div>
        </div>
        <div className="text-left sm:text-right text-xs">
          <div className="font-semibold text-text-primary">SUPPLIER PAYMENT</div>
          <div className="mt-1 text-text-secondary">Status: {payment.status}</div>
          {payment.reference && (
            <div className="text-text-secondary">
              Reference: {payment.reference}
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="rounded-lg border border-border/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
            Supplier
          </div>
          <div className="mt-1.5 font-semibold text-text-primary text-sm">
            {payment.supplierName}
          </div>
        </div>
        <div className="rounded-lg border border-border/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
            Payment Summary
          </div>
          <dl className="mt-1.5 space-y-1">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Bills covered</dt>
              <dd className="font-mono text-text-primary">
                {payment.allocations.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Allocated</dt>
              <dd className="font-mono text-text-primary">
                {formatCurrency(allocated)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Currency</dt>
              <dd className="font-mono text-text-primary">
                {payment.currency}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-alt/50 text-left text-text-secondary">
              <th className="px-3 py-2.5 font-semibold">Purchase Bill</th>
              <th className="px-3 py-2.5 font-semibold text-right">
                Amount Applied
              </th>
            </tr>
          </thead>
          <tbody>
            {payment.allocations.map((line) => (
              <tr key={line.id} className="border-t border-border/60">
                <td className="px-3 py-2.5 font-mono font-medium text-text-primary">
                  {line.billNumber || line.purchaseBillId}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-medium text-text-primary">
                  {formatCurrency(line.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payment.notes && (
        <div className="text-xs">
          <div className="font-semibold text-text-primary">Notes</div>
          <p className="mt-1 text-text-secondary whitespace-pre-line">
            {payment.notes}
          </p>
        </div>
      )}

      {payment.status === "Reversed" && (
        <div className="rounded-lg border border-border/60 p-4 text-xs">
          <div className="font-semibold text-text-primary">
            Reversal Record
          </div>
          <p className="mt-1 text-text-secondary">
            Reversed{payment.reversedAt ? ` on ${payment.reversedAt}` : ""}
            {payment.reversalReason ? `: ${payment.reversalReason}` : "."}
          </p>
        </div>
      )}
    </article>
  );
};
