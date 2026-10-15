import type { Estimate } from "../../domain/entities/estimate";
import {
  calculateEstimateTotals,
  formatCurrency,
  formatEstimateDate,
  lineTaxable,
} from "../../domain/rules/estimate-rules";

export const EstimateDocument = ({
  estimate,
  supplierName,
}: {
  estimate: Estimate;
  supplierName?: string;
}) => {
  const totals = calculateEstimateTotals({
    items: estimate.items,
    taxMode: estimate.taxMode,
    additionalCharges: estimate.additionalCharges,
    additionalDiscount: estimate.additionalDiscount,
    additionalDiscountType: estimate.additionalDiscountType,
  });

  return (
    <article
      className="overflow-hidden rounded-2xl bg-doc-paper text-doc-ink shadow-xl"
      aria-label={`Estimate ${estimate.estimateNumber} document`}
    >
      {/* Header */}
      <div className="bg-doc-header px-6 py-7 text-doc-header-text sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-doc-faint">
          {supplierName || "Aventra Billing"}
        </p>
        <p className="mt-1 text-xs text-doc-faint">Commercial Estimate &amp; Quotation</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold font-mono">
            {estimate.estimateNumber}
          </h2>
          <div className="text-right text-sm text-doc-faint space-y-0.5">
            <p>Quotation Date: {formatEstimateDate(estimate.issueDate)}</p>
            <p className="text-xs text-doc-faint/80">
              Valid Until: {formatEstimateDate(estimate.validUntil)}
            </p>
          </div>
        </div>
      </div>

      {/* Customer & Reference */}
      <div className="grid gap-6 px-6 py-7 sm:grid-cols-2 sm:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
            Quotation Prepared For
          </p>
          <p className="mt-2 font-semibold text-base">{estimate.customer}</p>
          {estimate.customerEmail && (
            <p className="text-sm text-doc-muted">{estimate.customerEmail}</p>
          )}
          {estimate.customerAddress && (
            <p className="text-sm text-doc-muted">{estimate.customerAddress}</p>
          )}
          {estimate.customerGstin && (
            <p className="text-sm text-doc-muted">GSTIN: {estimate.customerGstin}</p>
          )}
          {estimate.customerPlaceOfSupply && (
            <p className="text-sm text-doc-muted">
              Place of Supply: {estimate.customerPlaceOfSupply}
            </p>
          )}
        </div>

        <div className="sm:text-right space-y-2">
          {estimate.referenceNumber && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
                Reference / PO
              </p>
              <p className="mt-1 font-mono font-medium">{estimate.referenceNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
              Quotation Status
            </p>
            <p className="mt-1 font-semibold">{estimate.status}</p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-x-auto px-6 sm:px-10">
        <table className="w-full min-w-130 text-sm">
          <thead>
            <tr className="border-b border-doc-line text-left text-xs uppercase tracking-widest text-doc-muted">
              <th className="py-3">Item</th>
              <th className="py-3 text-right">Qty</th>
              <th className="py-3 text-right">Rate</th>
              <th className="py-3 text-right">Disc %</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.items.map((line) => (
              <tr key={line.id} className="border-b border-doc-line">
                <td className="py-4">
                  <p className="font-semibold">{line.item}</p>
                  {line.description && (
                    <p className="text-xs text-doc-muted">{line.description}</p>
                  )}
                  {line.hsnSac && (
                    <p className="text-[11px] text-doc-muted font-mono">
                      HSN: {line.hsnSac}
                    </p>
                  )}
                </td>
                <td className="py-4 text-right font-mono">
                  {line.quantity}
                  {line.unit ? ` ${line.unit}` : ""}
                </td>
                <td className="py-4 text-right font-mono">
                  {formatCurrency(line.unitPrice)}
                </td>
                <td className="py-4 text-right font-mono">
                  {line.discount > 0 ? `${line.discount}%` : "—"}
                </td>
                <td className="py-4 text-right font-mono font-semibold">
                  {formatCurrency(lineTaxable(line))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Breakdown */}
      <div className="ml-auto max-w-sm space-y-2.5 px-6 py-7 sm:px-10">
        <div className="flex justify-between text-sm text-doc-muted">
          <span>Subtotal</span>
          <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-sm text-doc-muted">
            <span>Discount</span>
            <span className="font-mono">−{formatCurrency(totals.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-doc-muted border-t border-doc-line pt-2">
          <span>Taxable Amount</span>
          <span className="font-mono">{formatCurrency(totals.taxable)}</span>
        </div>
        {estimate.taxMode === "IGST" ? (
          <div className="flex justify-between text-sm text-doc-muted">
            <span>IGST</span>
            <span className="font-mono">{formatCurrency(totals.igst)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm text-doc-muted">
              <span>CGST</span>
              <span className="font-mono">{formatCurrency(totals.cgst)}</span>
            </div>
            <div className="flex justify-between text-sm text-doc-muted">
              <span>SGST</span>
              <span className="font-mono">{formatCurrency(totals.sgst)}</span>
            </div>
          </>
        )}
        {totals.additionalCharges !== undefined && totals.additionalCharges > 0 && (
          <div className="flex justify-between text-sm text-doc-muted">
            <span>Charges</span>
            <span className="font-mono">+{formatCurrency(totals.additionalCharges)}</span>
          </div>
        )}
        <div className="flex justify-between rounded-xl bg-doc-total-band px-4 py-4 text-lg font-bold">
          <span>Estimate Total</span>
          <span className="font-mono">{formatCurrency(totals.total)}</span>
        </div>
      </div>

      {/* Notes & Terms Footer */}
      {(estimate.notes || estimate.terms) && (
        <div className="grid gap-5 border-t border-doc-line bg-doc-card px-6 py-6 text-sm sm:grid-cols-2 sm:px-10">
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider text-doc-muted">
              Customer Notes
            </p>
            <p className="mt-1 text-doc-ink leading-relaxed whitespace-pre-wrap">
              {estimate.notes || "—"}
            </p>
          </div>
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider text-doc-muted">
              Terms &amp; Conditions
            </p>
            <p className="mt-1 text-doc-ink leading-relaxed whitespace-pre-wrap">
              {estimate.terms || "—"}
            </p>
          </div>
        </div>
      )}
    </article>
  );
};
