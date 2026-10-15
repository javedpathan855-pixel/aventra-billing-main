import Link from "next/link";
import type { SalesReturn } from "../../domain/entities/sales-return";
import { SalesReturnStatusBadge } from "./SalesReturnStatusBadge";

export type SalesReturnDocumentProps = {
  salesReturn: SalesReturn;
  organizationName?: string;
  organizationAddress?: string;
  organizationGstin?: string;
};

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);

export const SalesReturnDocument = ({
  salesReturn,
  organizationName = "Aventra Billing",
  organizationAddress,
  organizationGstin,
}: SalesReturnDocumentProps) => {
  const formattedReturnDate = new Date(salesReturn.returnDate).toLocaleDateString(
    "en-IN",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  return (
    <div className="bg-surface-card border border-border rounded-xl p-6 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none space-y-8 text-text-primary">
      {/* Document Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded mb-2">
            Return Authorization &amp; Inspection Note
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            SALES RETURN
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Goods Return &bull; Disposition &bull; Credit Adjustment Document
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <SalesReturnStatusBadge status={salesReturn.status} />
          <div className="mt-3 font-mono font-bold text-lg text-text-primary">
            {salesReturn.returnNumber}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">
            Return Date: <span className="font-medium text-text-primary">{formattedReturnDate}</span>
          </div>
          {salesReturn.invoiceNumber && (
            <div className="text-xs text-text-secondary mt-0.5">
              Original Invoice:{" "}
              <Link
                href={`/invoices/${salesReturn.invoiceId}`}
                className="font-mono font-semibold text-primary hover:underline"
              >
                {salesReturn.invoiceNumber}
              </Link>
            </div>
          )}
          {salesReturn.creditNoteNumber && (
            <div className="text-xs text-text-secondary mt-0.5">
              Adjustment Credit Note:{" "}
              <Link
                href={`/credit-notes/${salesReturn.creditNoteId}`}
                className="font-mono font-semibold text-info hover:underline"
              >
                {salesReturn.creditNoteNumber}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Two Columns: Organization & Customer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        <div className="rounded-lg border border-border/60 bg-surface-alt/20 p-4 space-y-1.5 text-xs sm:text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Return Received At
          </span>
          <div className="font-bold text-base text-text-primary">{organizationName}</div>
          {organizationAddress && (
            <div className="text-text-secondary whitespace-pre-line leading-relaxed">
              {organizationAddress}
            </div>
          )}
          {organizationGstin && (
            <div className="text-text-muted font-mono text-xs pt-1">
              GSTIN: {organizationGstin}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-surface-alt/20 p-4 space-y-1.5 text-xs sm:text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Returned By (Customer)
          </span>
          <div className="font-bold text-base text-text-primary">{salesReturn.customerName}</div>
          {salesReturn.customerAddress && (
            <div className="text-text-secondary whitespace-pre-line leading-relaxed">
              {salesReturn.customerAddress}
            </div>
          )}
          {salesReturn.customerGstin && (
            <div className="text-text-muted font-mono text-xs pt-1">
              GSTIN: {salesReturn.customerGstin}
            </div>
          )}
          {salesReturn.customerEmail && (
            <div className="text-text-secondary text-xs">{salesReturn.customerEmail}</div>
          )}
        </div>
      </div>

      {/* Reason Box */}
      <div className="rounded-lg border border-border/80 bg-surface-alt/30 p-4">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-1">
          Authorized Return Reason
        </span>
        <p className="text-sm font-medium text-text-primary">{salesReturn.reason}</p>
      </div>

      {/* Line Items Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-surface-alt/60 text-text-secondary border-b border-border">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
              <th className="py-2.5 px-3 font-semibold">Item &amp; Description</th>
              <th className="py-2.5 px-3 font-semibold text-right">Sold Qty</th>
              <th className="py-2.5 px-3 font-semibold text-right">Return Qty</th>
              <th className="py-2.5 px-3 font-semibold text-right">Recv Qty</th>
              <th className="py-2.5 px-3 font-semibold text-right">Unit Price</th>
              <th className="py-2.5 px-3 font-semibold text-center">Tax %</th>
              <th className="py-2.5 px-3 font-semibold text-center">Disposition</th>
              <th className="py-2.5 px-3 font-semibold text-right">Credit Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {salesReturn.items.map((it, idx) => (
              <tr key={it.id} className="hover:bg-surface-alt/30">
                <td className="py-2.5 px-3 text-center text-text-muted font-mono">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="font-medium text-text-primary">{it.item}</div>
                  {it.description && (
                    <div className="text-xs text-text-secondary mt-0.5">{it.description}</div>
                  )}
                  {it.reason && (
                    <div className="text-[11px] text-text-muted italic mt-0.5">Note: {it.reason}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-text-secondary">
                  {it.soldQuantity}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                  {it.returnQuantity}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-text-primary">
                  {it.receivedQuantity}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                  {formatCurrency(it.unitPrice)}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-text-secondary">
                  {it.taxRate}%
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase ${
                      it.disposition === "RESTOCK"
                        ? "bg-success/15 text-success"
                        : it.disposition === "DAMAGED"
                        ? "bg-danger/15 text-danger"
                        : "bg-warning/15 text-warning"
                    }`}
                  >
                    {it.disposition}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-text-primary font-mono">
                  {formatCurrency(it.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Summary */}
      <div className="flex justify-end">
        <div className="w-full sm:w-80 space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between text-text-secondary">
            <span>Taxable Subtotal:</span>
            <span className="font-mono text-text-primary">{formatCurrency(salesReturn.subtotal)}</span>
          </div>
          <div className="flex justify-between text-text-secondary">
            <span>Tax Amount ({salesReturn.taxMode}):</span>
            <span className="font-mono text-text-primary">{formatCurrency(salesReturn.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-text-primary border-t border-border pt-2">
            <span>Total Credit Eligible:</span>
            <span className="font-mono">{formatCurrency(salesReturn.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Notes / Terms */}
      {salesReturn.notes && (
        <div className="rounded-lg border border-border/60 p-4 space-y-1 text-xs sm:text-sm">
          <span className="font-semibold text-text-primary block text-xs uppercase tracking-wider">
            Return Terms &amp; Policy Notes
          </span>
          <p className="text-text-secondary whitespace-pre-line leading-relaxed">
            {salesReturn.notes}
          </p>
        </div>
      )}

      {/* Signatures */}
      <div className="border-t border-border/80 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs sm:text-sm">
          <div className="border border-border/80 rounded-lg p-5 flex flex-col justify-between h-36">
            <span className="text-xs uppercase tracking-wider font-semibold text-text-muted">
              Inspection Officer / Warehouse Acceptance
            </span>
            <div className="border-t border-dashed border-border/80 pt-2 text-xs text-text-muted flex justify-between">
              <span>Signature &amp; Verification Stamp</span>
              <span>Date</span>
            </div>
          </div>

          <div className="border border-border/80 rounded-lg p-5 flex flex-col justify-between h-36">
            <span className="text-xs uppercase tracking-wider font-semibold text-text-muted">
              Finance &amp; Credit Authorization
            </span>
            <div className="border-t border-dashed border-border/80 pt-2 text-xs text-text-muted flex justify-between">
              <span>Authorized Signatory</span>
              <span>Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
