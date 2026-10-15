import { BadgePercent, Calculator, Percent, Tag, Truck } from "lucide-react";
import type { InvoiceTotals } from "@/features/invoices";
import { Input, Label, Select } from "@/shared/components/form";

export type RecurringChargesDiscountProps = {
  additionalCharges: number;
  onAdditionalChargesChange: (val: number) => void;
  additionalChargesLabel: string;
  onAdditionalChargesLabelChange: (val: string) => void;
  additionalDiscount: number;
  onAdditionalDiscountChange: (val: number) => void;
  additionalDiscountType: "percentage" | "fixed";
  onAdditionalDiscountTypeChange: (val: "percentage" | "fixed") => void;
  additionalDiscountLabel: string;
  onAdditionalDiscountLabelChange: (val: string) => void;
};

/**
 * Recurring schedule charges & discount editor. Mirrors the Create Invoice
 * `AdditionalChargesAndDiscountSection` structure and styling; values are
 * frozen into the schedule template and reproduced on every generated
 * invoice by the server. Kept feature-owned: importing the invoice
 * feature's private section would violate feature boundaries, and shared/
 * would violate the feature-agnostic rule for billing-specific UI.
 */
export const RecurringChargesDiscount = ({
  additionalCharges,
  onAdditionalChargesChange,
  additionalChargesLabel,
  onAdditionalChargesLabelChange,
  additionalDiscount,
  onAdditionalDiscountChange,
  additionalDiscountType,
  onAdditionalDiscountTypeChange,
  additionalDiscountLabel,
  onAdditionalDiscountLabelChange,
}: RecurringChargesDiscountProps) => {
  const handleChargesInput = (value: string) => {
    const parsed = Number.parseFloat(value);
    onAdditionalChargesChange(Number.isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  const handleDiscountInput = (value: string) => {
    const parsed = Number.parseFloat(value);
    onAdditionalDiscountChange(Number.isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  return (
    <section className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
            aria-hidden="true"
          >
            <BadgePercent size={19} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
              Additional Charges &amp; Discount
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Saved into the schedule template and applied to every generated invoice.
            </p>
          </div>
        </div>

        <div className="mt-5 grid flex-1 grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface-alt/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-primary-light" />
                <h3 className="text-sm font-semibold text-text-primary">Additional Charges</h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Shipping, handling, packaging, or extra service fees.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <Label
                    htmlFor="recurring-charges-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Charge Description
                  </Label>
                  <Input
                    id="recurring-charges-label"
                    type="text"
                    value={additionalChargesLabel}
                    onChange={(e) => onAdditionalChargesLabelChange(e.target.value)}
                    placeholder="e.g. Shipping / Delivery"
                    className="h-9 px-3 text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="recurring-charges-amount"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Amount (₹)
                  </Label>
                  <Input
                    id="recurring-charges-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={additionalCharges === 0 ? "" : additionalCharges}
                    onChange={(e) => handleChargesInput(e.target.value)}
                    placeholder="0.00"
                    startIcon={<span className="text-xs">₹</span>}
                    className="h-9 text-sm tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Presets:</span>
              {["Shipping", "Packaging", "Handling", "Delivery"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAdditionalChargesLabelChange(preset)}
                  className="rounded-md border border-border/70 bg-surface px-2 py-0.5 text-[11px] text-text-secondary hover:border-primary-light hover:text-text-primary transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface-alt/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-primary-light" />
                <h3 className="text-sm font-semibold text-text-primary">Additional Discount</h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Apply a flat amount or percentage discount to each invoice.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <Label
                    htmlFor="recurring-discount-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Discount Reason
                  </Label>
                  <Input
                    id="recurring-discount-label"
                    type="text"
                    value={additionalDiscountLabel}
                    onChange={(e) => onAdditionalDiscountLabelChange(e.target.value)}
                    placeholder="e.g. Seasonal Offer / Promo"
                    className="h-9 px-3 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label
                      htmlFor="recurring-discount-type"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      Type
                    </Label>
                    <Select
                      id="recurring-discount-type"
                      value={additionalDiscountType}
                      onChange={(val) =>
                        onAdditionalDiscountTypeChange(val as "percentage" | "fixed")
                      }
                      className="h-9 text-xs"
                    >
                      <option value="fixed">Fixed (₹)</option>
                      <option value="percentage">Percent (%)</option>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="recurring-discount-amount"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      {additionalDiscountType === "percentage" ? "Rate (%)" : "Amount (₹)"}
                    </Label>
                    <Input
                      id="recurring-discount-amount"
                      type="number"
                      min="0"
                      max={additionalDiscountType === "percentage" ? "100" : undefined}
                      step="any"
                      value={additionalDiscount === 0 ? "" : additionalDiscount}
                      onChange={(e) => handleDiscountInput(e.target.value)}
                      placeholder="0.00"
                      className="h-9 px-3 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Presets:</span>
              {["Special Offer", "VIP Client", "Year-End Discount"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAdditionalDiscountLabelChange(preset)}
                  className="rounded-md border border-border/70 bg-surface px-2 py-0.5 text-[11px] text-text-secondary hover:border-primary-light hover:text-text-primary transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export type RecurringSummaryProps = {
  totals: InvoiceTotals;
  taxMode: "CGST_SGST" | "IGST";
  firstRunDate: string;
  firstDueDate: string;
  invoiceNumberPreview: string;
  items?: Array<{
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
  }>;
};

const formatCurrencyExact = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

type GstSlab = {
  rate: number;
  taxable: number;
  tax: number;
};

// Display-only slab aggregation mirroring Create Invoice's summary breakdown.
const calculatePreviewSlabs = (
  items: Array<{ quantity: number; unitPrice: number; discount: number; taxRate: number }> = [],
): GstSlab[] => {
  const map = new Map<number, { taxable: number; tax: number }>();

  items.forEach((line) => {
    const subtotal = line.quantity * line.unitPrice;
    const itemDiscount = subtotal * (line.discount / 100);
    const taxable = Math.max(0, subtotal - itemDiscount);
    const tax = taxable * (line.taxRate / 100);

    const prev = map.get(line.taxRate) || { taxable: 0, tax: 0 };
    map.set(line.taxRate, {
      taxable: prev.taxable + taxable,
      tax: prev.tax + tax,
    });
  });

  return Array.from(map.entries())
    .map(([rate, data]) => ({
      rate,
      taxable: Math.round((data.taxable + Number.EPSILON) * 100) / 100,
      tax: Math.round((data.tax + Number.EPSILON) * 100) / 100,
    }))
    .sort((a, b) => b.rate - a.rate);
};

/**
 * Next-invoice summary card. Follows the Create Invoice `InvoiceSummarySection`
 * structure (rows, GST sub-card with rate slabs, pinned total) for the
 * template preview. Differences are deliberate: the title/subtitle mark it
 * estimated, there is no interactive tax-mode toggle (the server recomputes
 * the mode per generation from place of supply, so a toggle would mislead),
 * and previewing never persists or numbers anything.
 */
export const RecurringSummary = ({
  totals,
  taxMode,
  firstRunDate,
  firstDueDate,
  invoiceNumberPreview,
  items = [],
}: RecurringSummaryProps) => {
  const halfTax = Math.round((totals.tax / 2 + Number.EPSILON) * 100) / 100;
  const otherHalf = Math.round((totals.tax - halfTax + Number.EPSILON) * 100) / 100;
  const slabs = calculatePreviewSlabs(items);

  return (
    <section className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      <div>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
            aria-hidden="true"
          >
            <Calculator size={19} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
              Invoice Summary
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Estimated totals for the next scheduled invoice.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between text-text-secondary">
            <span>Subtotal</span>
            <span className="font-medium text-text-primary tabular-nums">
              {formatCurrencyExact(totals.subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-text-secondary">
            <span>Discount</span>
            <span className="font-medium text-text-primary tabular-nums">
              {totals.discount > 0 ? `−${formatCurrencyExact(totals.discount)}` : formatCurrencyExact(0)}
            </span>
          </div>

          {totals.additionalCharges !== undefined && totals.additionalCharges > 0 && (
            <div className="flex items-center justify-between text-text-secondary">
              <span>Additional Charges</span>
              <span className="font-medium text-text-primary tabular-nums">
                +{formatCurrencyExact(totals.additionalCharges)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-text-secondary">
            <span>Taxable Amount</span>
            <span className="font-medium text-text-primary tabular-nums">
              {formatCurrencyExact(totals.taxable)}
            </span>
          </div>

          <div className="flex items-center justify-between text-text-secondary">
            <span>Tax Amount</span>
            <span className="font-medium text-text-primary tabular-nums">
              {formatCurrencyExact(totals.tax)}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border/80 bg-surface-alt/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Percent size={14} className="text-primary-light" />
              <span className="text-xs font-semibold text-text-primary">GST Summary</span>
            </div>

            <span className="text-[10px] font-medium text-text-muted">
              {taxMode === "IGST" ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)"}
            </span>
          </div>

          <div className="space-y-1.5 text-xs pt-1 border-t border-border/50">
            {taxMode === "CGST_SGST" ? (
              <>
                <div className="flex items-center justify-between text-text-secondary">
                  <span>Central GST (CGST)</span>
                  <span className="font-medium text-text-primary tabular-nums">
                    {formatCurrencyExact(halfTax)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span>State GST (SGST)</span>
                  <span className="font-medium text-text-primary tabular-nums">
                    {formatCurrencyExact(otherHalf)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-text-secondary">
                <span>Integrated GST (IGST)</span>
                <span className="font-medium text-text-primary tabular-nums">
                  {formatCurrencyExact(totals.tax)}
                </span>
              </div>
            )}

            {slabs.length > 0 && slabs.some((s) => s.tax > 0) && (
              <div className="pt-2 mt-2 border-t border-border/40 space-y-1">
                <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                  Rate Slabs
                </div>
                {slabs.map((slab) => (
                  <div
                    key={slab.rate}
                    className="flex items-center justify-between text-[11px] text-text-secondary"
                  >
                    <span>
                      GST @ {slab.rate}% (on {formatCurrencyExact(slab.taxable)})
                    </span>
                    <span className="font-medium text-text-primary tabular-nums">
                      {formatCurrencyExact(slab.tax)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
          First billing {firstRunDate} · due {firstDueDate} ·{" "}
          {invoiceNumberPreview
            ? `number preview ${invoiceNumberPreview}`
            : "number auto-allocated on generation"}
          . Preview only — never persisted or numbered.
        </p>
      </div>

      <div className="border-t border-border pt-4 mt-6 flex items-baseline justify-between">
        <span className="font-heading text-base font-semibold text-text-primary">Total Amount</span>
        <span className="font-heading text-2xl font-bold tracking-tight text-primary-light tabular-nums">
          {formatCurrencyExact(totals.total)}
        </span>
      </div>
    </section>
  );
};
