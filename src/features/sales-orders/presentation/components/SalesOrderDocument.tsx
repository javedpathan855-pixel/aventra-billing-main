import type { SalesOrder } from "../../domain/entities/sales-order";
import { calculateSalesOrderTotals } from "../../domain/rules/sales-order-rules";

const formatCurrencyExact = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export type SalesOrderDocumentProps = {
  order: SalesOrder;
  supplierName?: string;
};

export const SalesOrderDocument = ({
  order,
  supplierName,
}: SalesOrderDocumentProps) => {
  const totals = calculateSalesOrderTotals({
    items: order.items,
    taxMode: order.taxMode,
    additionalCharges: order.additionalCharges,
    additionalDiscount: order.additionalDiscount,
    additionalDiscountType: order.additionalDiscountType,
  });

  return (
    <article
      className="overflow-hidden rounded-2xl bg-doc-paper text-doc-ink shadow-xl print:shadow-none print:rounded-none"
      aria-label={`Sales Order ${order.orderNumber} document`}
    >
      {/* Header Banner */}
      <div className="bg-doc-header px-6 py-7 text-doc-header-text sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-doc-faint">
          {supplierName || "Aventra Billing"}
        </p>
        <p className="mt-1 text-xs text-doc-faint">Official Sales Order &amp; Purchase Confirmation</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold font-mono">
            {order.orderNumber}
          </h2>
          <div className="text-right text-sm text-doc-faint space-y-0.5">
            <p>Order Date: {order.orderDate}</p>
            {order.expectedDeliveryDate && (
              <p className="text-xs text-doc-faint/80">
                Expected Delivery: {order.expectedDeliveryDate}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Customer & Reference Metadata */}
      <div className="grid gap-6 px-6 py-7 sm:grid-cols-2 sm:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
            Customer / Consignee
          </p>
          <p className="mt-2 font-semibold text-base">{order.customerName}</p>
          {order.customerEmail && (
            <p className="text-sm text-doc-muted">{order.customerEmail}</p>
          )}
          {order.customerAddress && (
            <p className="text-sm text-doc-muted whitespace-pre-line">
              {order.customerAddress}
            </p>
          )}
          {order.customerGstin && (
            <p className="text-sm text-doc-muted">GSTIN: {order.customerGstin}</p>
          )}
          {order.customerPlaceOfSupply && (
            <p className="text-sm text-doc-muted">
              Place of Supply: {order.customerPlaceOfSupply}
            </p>
          )}
        </div>

        <div className="sm:text-right space-y-3">
          {order.referenceNumber && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
                Customer PO / Reference #
              </p>
              <p className="mt-1 font-mono font-medium">{order.referenceNumber}</p>
            </div>
          )}
          {order.sourceEstimateNumber && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
                Source Quotation
              </p>
              <p className="mt-1 font-mono font-medium">{order.sourceEstimateNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
              Order Status
            </p>
            <p className="mt-1 font-semibold">{order.status}</p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-x-auto px-6 sm:px-10">
        <table className="w-full min-w-130 text-sm">
          <thead>
            <tr className="border-b border-doc-line text-left text-xs uppercase tracking-widest text-doc-muted">
              <th className="py-3">Item Details</th>
              <th className="py-3">HSN/SAC</th>
              <th className="py-3 text-right">Qty</th>
              <th className="py-3 text-right">Rate</th>
              <th className="py-3 text-right">Disc %</th>
              <th className="py-3 text-right">Tax</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-doc-line/60">
            {order.items.map((line) => {
              const gross = line.quantity * line.unitPrice;
              const disc = gross * (line.discount / 100);
              const taxable = Math.max(0, gross - disc);
              const tax = taxable * (line.taxRate / 100);
              const lineTotal = taxable + tax;

              return (
                <tr key={line.id}>
                  <td className="py-3">
                    <p className="font-semibold">{line.item}</p>
                    {line.description && (
                      <p className="text-xs text-doc-muted">{line.description}</p>
                    )}
                  </td>
                  <td className="py-3 text-xs font-mono text-doc-muted">
                    {line.hsnSac || "—"}
                  </td>
                  <td className="py-3 text-right font-mono">{line.quantity}</td>
                  <td className="py-3 text-right font-mono">
                    {formatCurrencyExact(line.unitPrice)}
                  </td>
                  <td className="py-3 text-right font-mono">
                    {line.discount > 0 ? `${line.discount}%` : "—"}
                  </td>
                  <td className="py-3 text-right font-mono text-xs text-doc-muted">
                    {line.taxRate}%
                  </td>
                  <td className="py-3 text-right font-mono font-semibold">
                    {formatCurrencyExact(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-6 px-6 py-7 sm:grid-cols-2 sm:px-10">
        <div>
          {order.notes && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
                Notes
              </p>
              <p className="mt-1 text-sm text-doc-muted leading-relaxed whitespace-pre-line">
                {order.notes}
              </p>
            </div>
          )}
          {order.terms && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-doc-muted">
                Terms &amp; Conditions
              </p>
              <p className="mt-1 text-sm text-doc-muted leading-relaxed whitespace-pre-line">
                {order.terms}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm sm:text-right">
          <div className="flex justify-between sm:justify-end sm:gap-8">
            <span className="text-doc-muted">Subtotal</span>
            <span className="font-mono">{formatCurrencyExact(totals.subtotal)}</span>
          </div>

          {totals.lineDiscountTotal > 0 && (
            <div className="flex justify-between sm:justify-end sm:gap-8">
              <span className="text-doc-muted">Line Discounts</span>
              <span className="font-mono text-success">
                −{formatCurrencyExact(totals.lineDiscountTotal)}
              </span>
            </div>
          )}

          {totals.effectiveAdditionalDiscount > 0 && (
            <div className="flex justify-between sm:justify-end sm:gap-8">
              <span className="text-doc-muted">Order Discount</span>
              <span className="font-mono text-success">
                −{formatCurrencyExact(totals.effectiveAdditionalDiscount)}
              </span>
            </div>
          )}

          {totals.additionalCharges > 0 && (
            <div className="flex justify-between sm:justify-end sm:gap-8">
              <span className="text-doc-muted">
                {order.additionalChargesLabel || "Additional Charges"}
              </span>
              <span className="font-mono">
                +{formatCurrencyExact(totals.additionalCharges)}
              </span>
            </div>
          )}

          <div className="flex justify-between sm:justify-end sm:gap-8 border-t border-doc-line pt-2">
            <span className="text-doc-muted font-medium">Taxable Amount</span>
            <span className="font-mono font-medium">
              {formatCurrencyExact(totals.taxableAmount)}
            </span>
          </div>

          {order.taxMode === "CGST_SGST" ? (
            <>
              <div className="flex justify-between sm:justify-end sm:gap-8 text-xs text-doc-muted">
                <span>CGST Total</span>
                <span className="font-mono">{formatCurrencyExact(totals.cgst)}</span>
              </div>
              <div className="flex justify-between sm:justify-end sm:gap-8 text-xs text-doc-muted">
                <span>SGST Total</span>
                <span className="font-mono">{formatCurrencyExact(totals.sgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between sm:justify-end sm:gap-8 text-xs text-doc-muted">
              <span>IGST Total</span>
              <span className="font-mono">{formatCurrencyExact(totals.igst)}</span>
            </div>
          )}

          <div className="flex justify-between sm:justify-end sm:gap-8 border-t-2 border-doc-ink pt-2 text-base font-bold">
            <span>Total Order Value</span>
            <span className="font-mono text-lg">
              {formatCurrencyExact(totals.total)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
