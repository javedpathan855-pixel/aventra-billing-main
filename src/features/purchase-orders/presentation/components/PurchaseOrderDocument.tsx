import type { PurchaseOrder } from "../../domain/entities/purchase-order";
import { calculatePurchaseOrderTotals } from "../../domain/rules/purchase-order-rules";

export type PurchaseOrderDocumentProps = {
  order: PurchaseOrder;
  organizationName?: string;
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

export const PurchaseOrderDocument = ({
  order,
  organizationName,
}: PurchaseOrderDocumentProps) => {
  const totals = calculatePurchaseOrderTotals({
    items: order.items,
    taxMode: order.taxMode,
    additionalCharges: order.additionalCharges,
    additionalDiscount: order.additionalDiscount,
    additionalDiscountType: order.additionalDiscountType,
  });

  return (
    <article className="rounded-2xl border border-border bg-doc-paper p-6 sm:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-text-muted">
            {organizationName || "Aventra Billing"}
          </div>
          <h2 className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-text-primary">
            {order.orderNumber}
          </h2>
          <div className="mt-1 text-xs text-text-secondary">
            Order Date: {order.orderDate}
            {order.expectedDeliveryDate &&
              ` • Expected Delivery: ${order.expectedDeliveryDate}`}
          </div>
        </div>
        <div className="text-left sm:text-right text-xs">
          <div className="font-semibold text-text-primary">PURCHASE ORDER</div>
          <div className="mt-1 text-text-secondary">
            Status: {order.status}
          </div>
          {order.referenceNumber && (
            <div className="text-text-secondary">
              Supplier Ref: {order.referenceNumber}
            </div>
          )}
          {order.paymentTerms && (
            <div className="text-text-secondary">
              Payment: {order.paymentTerms}
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
            {order.supplierName}
          </div>
          {order.supplierAddress && (
            <div className="mt-1 text-text-secondary">{order.supplierAddress}</div>
          )}
          {order.supplierEmail && (
            <div className="text-text-secondary">{order.supplierEmail}</div>
          )}
          {order.supplierGstin && (
            <div className="mt-1 font-mono text-text-secondary">
              GSTIN: {order.supplierGstin}
            </div>
          )}
          {order.supplierPlaceOfSupply && (
            <div className="text-text-secondary">
              Place of Supply: {order.supplierPlaceOfSupply}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
            Order Summary
          </div>
          <dl className="mt-1.5 space-y-1">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Items</dt>
              <dd className="font-mono text-text-primary">
                {order.items.length}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Tax Mode</dt>
              <dd className="font-mono text-text-primary">
                {order.taxMode === "CGST_SGST" ? "CGST + SGST" : "IGST"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Currency</dt>
              <dd className="font-mono text-text-primary">{order.currency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Receiving</dt>
              <dd className="font-mono text-text-primary">
                {totals.receivingPercentage}% received
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
            {order.items.map((line) => (
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
          {order.notes && (
            <div>
              <div className="font-semibold text-text-primary">Notes</div>
              <p className="mt-1 text-text-secondary whitespace-pre-line">
                {order.notes}
              </p>
            </div>
          )}
          {order.terms && (
            <div>
              <div className="font-semibold text-text-primary">
                Terms &amp; Conditions
              </div>
              <p className="mt-1 text-text-secondary whitespace-pre-line">
                {order.terms}
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
              <dt className="text-text-secondary">Order Discount</dt>
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
          {order.taxMode === "CGST_SGST" ? (
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
            <dt className="font-semibold text-text-primary">Total Order Value</dt>
            <dd className="font-mono font-bold text-text-primary">
              {formatCurrency(totals.total)}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
};
