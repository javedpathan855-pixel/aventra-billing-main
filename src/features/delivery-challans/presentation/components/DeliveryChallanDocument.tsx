import type { DeliveryChallan } from "../../domain/entities/delivery-challan";
import { DeliveryChallanStatusBadge } from "./DeliveryChallanStatusBadge";

export type DeliveryChallanDocumentProps = {
  challan: DeliveryChallan;
  organizationName?: string;
  organizationAddress?: string;
  organizationGstin?: string;
};

export const DeliveryChallanDocument = ({
  challan,
  organizationName = "Aventra Billing",
  organizationAddress,
  organizationGstin,
}: DeliveryChallanDocumentProps) => {
  const formattedChallanDate = new Date(challan.challanDate).toLocaleDateString(
    "en-IN",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  const formattedDispatchDate = challan.dispatchDate
    ? new Date(challan.dispatchDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const totalDelivered = challan.items.reduce(
    (acc, it) => acc + it.deliveredQuantity,
    0,
  );

  return (
    <div className="bg-surface-card border border-border rounded-xl p-6 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none space-y-8 text-text-primary">
      {/* Document Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border/80 pb-6">
        <div>
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded mb-2">
            Goods Dispatch Document
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            DELIVERY CHALLAN
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Issued under Delivery &amp; Dispatch Rules &bull; (Non-Tax Commercial Document)
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <DeliveryChallanStatusBadge status={challan.status} />
          <div className="mt-3 font-mono font-bold text-lg text-text-primary">
            {challan.challanNumber}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">
            Date: <span className="font-medium text-text-primary">{formattedChallanDate}</span>
          </div>
          {challan.salesOrderNumber && (
            <div className="text-xs text-text-secondary mt-0.5">
              Sales Order: <span className="font-mono font-semibold text-text-primary">{challan.salesOrderNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Entities: Consignor (Seller) & Consignee (Buyer/Deliver to) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        {/* Consignor */}
        <div className="rounded-lg border border-border/60 bg-surface-alt/20 p-4 space-y-1.5 text-xs sm:text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Dispatched From (Consignor)
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

        {/* Consignee */}
        <div className="rounded-lg border border-border/60 bg-surface-alt/20 p-4 space-y-1.5 text-xs sm:text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Deliver To (Consignee)
          </span>
          <div className="font-bold text-base text-text-primary">{challan.customerName}</div>
          {challan.deliveryAddress ? (
            <div className="text-text-secondary whitespace-pre-line leading-relaxed">
              {challan.deliveryAddress}
            </div>
          ) : (
            challan.customerAddress && (
              <div className="text-text-secondary whitespace-pre-line leading-relaxed">
                {challan.customerAddress}
              </div>
            )
          )}
          {challan.customerGstin && (
            <div className="text-text-muted font-mono text-xs pt-1">
              GSTIN: {challan.customerGstin}
            </div>
          )}
          {challan.customerEmail && (
            <div className="text-text-secondary text-xs">{challan.customerEmail}</div>
          )}
        </div>
      </div>

      {/* Transportation & Dispatch Details */}
      <div className="rounded-lg border border-border/80 bg-surface-alt/30 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
          Transport &amp; Dispatch Information
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-text-muted block text-xs">Transporter</span>
            <span className="font-medium text-text-primary">
              {challan.transporterName || "Direct / Hand Delivery"}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-xs">Vehicle Number</span>
            <span className="font-medium font-mono text-text-primary">
              {challan.vehicleNumber || "—"}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-xs">Tracking / Docket #</span>
            <span className="font-medium font-mono text-text-primary">
              {challan.trackingNumber || "—"}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-xs">Dispatch Date</span>
            <span className="font-medium text-text-primary">
              {formattedDispatchDate || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-surface-alt/60 text-text-secondary border-b border-border">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
              <th className="py-2.5 px-3 font-semibold">Item &amp; Description</th>
              <th className="py-2.5 px-3 font-semibold">HSN / SAC</th>
              <th className="py-2.5 px-3 font-semibold text-right">Ordered Qty</th>
              <th className="py-2.5 px-3 font-semibold text-right">Delivered Qty</th>
              <th className="py-2.5 px-3 font-semibold text-center w-16">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {challan.items.map((it, idx) => (
              <tr key={it.id} className="hover:bg-surface-alt/30">
                <td className="py-2.5 px-3 text-center text-text-muted font-mono">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="font-medium text-text-primary">{it.item}</div>
                  {it.description && (
                    <div className="text-xs text-text-secondary mt-0.5">{it.description}</div>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-text-secondary">{it.hsnSac || "—"}</td>
                <td className="py-2.5 px-3 text-right font-medium text-text-secondary">
                  {it.orderedQuantity}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-text-primary">
                  {it.deliveredQuantity}
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-text-secondary">
                  {it.unit}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-alt/40 border-t border-border font-semibold">
            <tr>
              <td colSpan={4} className="py-3 px-3 text-right text-text-secondary">
                Total Units Dispatched:
              </td>
              <td className="py-3 px-3 text-right text-base font-bold text-text-primary">
                {totalDelivered}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Instructions & Notes */}
      {(challan.notes || challan.terms) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm pt-2">
          {challan.notes && (
            <div className="rounded-lg border border-border/60 p-4 space-y-1">
              <span className="font-semibold text-text-primary block text-xs uppercase tracking-wider">
                Delivery Instructions
              </span>
              <p className="text-text-secondary whitespace-pre-line leading-relaxed">
                {challan.notes}
              </p>
            </div>
          )}
          {challan.terms && (
            <div className="rounded-lg border border-border/60 p-4 space-y-1">
              <span className="font-semibold text-text-primary block text-xs uppercase tracking-wider">
                Terms &amp; Disclaimers
              </span>
              <p className="text-text-secondary whitespace-pre-line leading-relaxed">
                {challan.terms}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recipient Acknowledgement Sign-Off */}
      <div className="border-t border-border/80 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs sm:text-sm">
          <div className="border border-border/80 rounded-lg p-5 flex flex-col justify-between h-36">
            <span className="text-xs uppercase tracking-wider font-semibold text-text-muted">
              For {organizationName} (Authorized Signatory)
            </span>
            <div className="border-t border-dashed border-border/80 pt-2 text-xs text-text-muted flex justify-between">
              <span>Signature &amp; Stamp</span>
              <span>Date</span>
            </div>
          </div>

          <div className="border border-border/80 rounded-lg p-5 flex flex-col justify-between h-36">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-text-muted">
                Customer Acknowledgement &amp; Goods Receipt
              </span>
              <p className="text-[11px] text-text-muted mt-1">
                Received the above listed goods in sound condition and correct quantity.
              </p>
            </div>
            <div className="border-t border-dashed border-border/80 pt-2 text-xs text-text-muted flex justify-between">
              <span>Recipient Signature &amp; Seal</span>
              <span>Received Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
