import type { PurchaseBill } from "../../domain/entities/purchase-bill";
import { calculatePurchaseBillTotals } from "../../domain/rules/purchase-bill-rules";

export type PurchaseBillDocumentProps = {
  bill: PurchaseBill;
  organizationName?: string;
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

/**
 * Read-only printable purchase bill. All figures are recomputed with the
 * domain totals so the preview always matches persisted values.
 */
export const PurchaseBillDocument = ({
  bill,
  organizationName,
}: PurchaseBillDocumentProps) => {
  const totals = calculatePurchaseBillTotals({
    items: bill.items,
    taxMode: bill.taxMode,
    additionalCharges: bill.additionalCharges,
    additionalDiscount: bill.additionalDiscount,
    additionalDiscountType: bill.additionalDiscountType,
  });

  return (
    <article className="rounded-2xl border border-border bg-doc-paper p-6 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-text-muted">
            {organizationName || "Aventra Billing"}
          </div>
          <h2 className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-text-primary">
            {bill.billNumber}
          </h2>
          <div className="mt-1 text-xs text-text-secondary">
            Bill Date: {bill.billDate} • Due Date: {bill.dueDate}
          </div>
        </div>
        <div className="text-left sm:text-right text-xs">
          <div className="font-semibold text-text-primary">PURCHASE BILL</div>
          <div className="mt-1 text-text-secondary">Status: {bill.status}</div>
          {bill.supplierInvoiceNumber && (
            <div className="text-text-secondary">
              Supplier Invoice: {bill.supplierInvoiceNumber}
              {bill.supplierInvoiceDate && ` (${bill.supplierInvoiceDate})`}
            </div>
          )}
          {bill.purchaseOrderNumber && (
            <div className="text-text-secondary">
              Against Order: {bill.purchaseOrderNumber}
            </div>
          )}
          {bill.paymentTerms && (
            <div className="text-text-secondary">
              Payment: {bill.paymentTerms}
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
            {bill.supplierName}
          </div>
          {bill.supplierAddress && (
            <div className="mt-1 text-text-secondary">{bill.supplierAddress}</div>
          )}
          {bill.supplierEmail && (
            <div className="text-text-secondary">{bill.supplierEmail}</div>
          )}
          {bill.supplierGstin && (
            <div className="mt-1 font-mono text-text-secondary">
              GSTIN: {bill.supplierGstin}
            </div>
          )}
          {bill.supplierPlaceOfSupply && (
            <div className="text-text-secondary">
              Place of Supply: {bill.supplierPlaceOfSupply}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
            Bill Summary
          </div>
          <dl className="mt-1.5 space-y-1">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Items</dt>
              <dd className="font-mono text-text-primary">
                {bill.items.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Tax Mode</dt>
              <dd className="font-mono text-text-primary">
                {bill.taxMode === "CGST_SGST" ? "CGST + SGST" : "IGST"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Currency</dt>
              <dd className="font-mono text-text-primary">{bill.currency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Taxable Amount</dt>
              <dd className="font-mono text-text-primary">
                {formatCurrency(totals.taxableAmount)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-alt/50 text-left text-text-secondary">
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-3 py-2.5 font-semibold">HSN/SAC</th>
              <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
              <th className="px-3 py-2.5 font-semibold text-right">Rate</th>
              <th className="px-3 py-2.5 font-semibold text-right">Disc%</th>
              <th className="px-3 py-2.5 font-semibold text-right">Tax</th>
              <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((line) => (
              <tr key={line.id} className="border-t border-border/60">
                <td className="px-3 py-2.5">
                  <div className="font-medium text-text-primary">{line.item}</div>
                  {line.description && (
                    <div className="text-text-muted">{line.description}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-text-secondary">
                  {line.hsnSac || "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                  {line.quantity}
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
          {bill.notes && (
            <div>
              <div className="font-semibold text-text-primary">Notes</div>
              <p className="mt-1 text-text-secondary whitespace-pre-line">
                {bill.notes}
              </p>
            </div>
          )}
          {bill.terms && (
            <div>
              <div className="font-semibold text-text-primary">
                Terms &amp; Conditions
              </div>
              <p className="mt-1 text-text-secondary whitespace-pre-line">
                {bill.terms}
              </p>
            </div>
          )}
        </div>
        <dl className="space-y-1.5 text-xs rounded-lg border border-border/60 p-4 h-fit">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Subtotal</dt>
            <dd className="font-mono text-text-primary">
              {formatCurrency(totals.subtotal)}
            </dd>
          </div>
          {totals.lineDiscountTotal > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">Line Discounts</dt>
              <dd className="font-mono text-success">
                − {formatCurrency(totals.lineDiscountTotal)}
              </dd>
            </div>
          )}
          {totals.effectiveAdditionalDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">Bill Discount</dt>
              <dd className="font-mono text-success">
                − {formatCurrency(totals.effectiveAdditionalDiscount)}
              </dd>
            </div>
          )}
          {totals.additionalCharges > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-secondary">Additional Charges</dt>
              <dd className="font-mono text-text-primary">
                + {formatCurrency(totals.additionalCharges)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border/60 pt-1.5">
            <dt className="text-text-secondary">Taxable Amount</dt>
            <dd className="font-mono text-text-primary">
              {formatCurrency(totals.taxableAmount)}
            </dd>
          </div>
          {bill.taxMode === "CGST_SGST" ? (
            <>
              <div className="flex justify-between">
                <dt className="text-text-secondary">CGST</dt>
                <dd className="font-mono text-text-primary">
                  {formatCurrency(totals.cgst)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">SGST</dt>
                <dd className="font-mono text-text-primary">
                  {formatCurrency(totals.sgst)}
                </dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <dt className="text-text-secondary">IGST</dt>
              <dd className="font-mono text-text-primary">
                {formatCurrency(totals.igst)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border/60 pt-2 text-sm">
            <dt className="font-semibold text-text-primary">Bill Total</dt>
            <dd className="font-mono font-bold text-text-primary">
              {formatCurrency(totals.total)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
};
