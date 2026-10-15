import type { PurchaseReturn } from "../../domain/entities/purchase-return";
import { calculatePurchaseReturnTotals } from "../../domain/rules/purchase-return-rules";

export type PurchaseReturnDocumentProps = {
  purchaseReturn: PurchaseReturn;
  organizationName?: string;
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

/**
 * Read-only printable purchase return. Figures are recomputed with the
 * domain totals so the preview always matches persisted values.
 */
export const PurchaseReturnDocument = ({
  purchaseReturn,
  organizationName,
}: PurchaseReturnDocumentProps) => {
  const totals = calculatePurchaseReturnTotals(
    purchaseReturn.items.map((it) => ({
      returnQuantity: it.returnQuantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    })),
  );

  return (
    <article className="rounded-2xl border border-border bg-doc-paper p-6 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-text-muted">
            {organizationName || "Aventra Billing"}
          </div>
          <h2 className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-text-primary">
            {purchaseReturn.returnNumber}
          </h2>
          <div className="mt-1 text-xs text-text-secondary">
            Return Date: {purchaseReturn.returnDate}
          </div>
        </div>
        <div className="text-left sm:text-right text-xs">
          <div className="font-semibold text-text-primary">PURCHASE RETURN</div>
          <div className="mt-1 text-text-secondary">
            Status: {purchaseReturn.status}
          </div>
          {purchaseReturn.purchaseBillNumber && (
            <div className="text-text-secondary">
              Against Bill: {purchaseReturn.purchaseBillNumber}
            </div>
          )}
          {purchaseReturn.purchaseOrderNumber && (
            <div className="text-text-secondary">
              Against Order: {purchaseReturn.purchaseOrderNumber}
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
            {purchaseReturn.supplierName}
          </div>
          {purchaseReturn.supplierAddress && (
            <div className="mt-1 text-text-secondary">
              {purchaseReturn.supplierAddress}
            </div>
          )}
          {purchaseReturn.supplierEmail && (
            <div className="text-text-secondary">
              {purchaseReturn.supplierEmail}
            </div>
          )}
          {purchaseReturn.supplierGstin && (
            <div className="mt-1 font-mono text-text-secondary">
              GSTIN: {purchaseReturn.supplierGstin}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
            Return Reason
          </div>
          <p className="mt-1.5 text-sm text-text-primary whitespace-pre-line">
            {purchaseReturn.reason}
          </p>
          <div className="mt-2 text-text-secondary">
            Tax Mode:{" "}
            {purchaseReturn.taxMode === "CGST_SGST" ? "CGST + SGST" : "IGST"}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-alt/50 text-left text-text-secondary">
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-3 py-2.5 font-semibold text-right">Billed</th>
              <th className="px-3 py-2.5 font-semibold text-right">Returned</th>
              <th className="px-3 py-2.5 font-semibold text-right">Rate</th>
              <th className="px-3 py-2.5 font-semibold text-right">Disc%</th>
              <th className="px-3 py-2.5 font-semibold text-right">Tax</th>
              <th className="px-3 py-2.5 font-semibold">Disposition</th>
              <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {purchaseReturn.items.map((line) => (
              <tr key={line.id} className="border-t border-border/60">
                <td className="px-3 py-2.5">
                  <div className="font-medium text-text-primary">{line.item}</div>
                  {line.description && (
                    <div className="text-text-muted">{line.description}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                  {line.billedQuantity}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                  {line.returnQuantity}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                  {formatCurrency(line.unitPrice)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                  {line.discount}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                  {line.taxRate}%
                </td>
                <td className="px-3 py-2.5 text-text-secondary">
                  {line.disposition}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-medium text-text-primary">
                  {formatCurrency(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3 text-xs">
          {purchaseReturn.notes && (
            <div>
              <div className="font-semibold text-text-primary">Notes</div>
              <p className="mt-1 text-text-secondary whitespace-pre-line">
                {purchaseReturn.notes}
              </p>
            </div>
          )}
          {purchaseReturn.terms && (
            <div>
              <div className="font-semibold text-text-primary">
                Terms &amp; Conditions
              </div>
              <p className="mt-1 text-text-secondary whitespace-pre-line">
                {purchaseReturn.terms}
              </p>
            </div>
          )}
        </div>
        <dl className="space-y-1.5 text-xs rounded-lg border border-border/60 p-4 h-fit">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Returned Subtotal</dt>
            <dd className="font-mono text-text-primary">
              {formatCurrency(totals.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Tax Amount</dt>
            <dd className="font-mono text-text-primary">
              {formatCurrency(totals.taxAmount)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 text-sm">
            <dt className="font-semibold text-text-primary">Return Total</dt>
            <dd className="font-mono font-bold text-text-primary">
              {formatCurrency(totals.totalAmount)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
};
