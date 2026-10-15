import { Calculator, Percent } from "lucide-react";
import { Button } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type { EstimateLineItem, EstimateTotals, TaxMode } from "../../domain/entities/estimate";

const formatCurrencyExact = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export type EstimateSummarySectionProps = {
  totals: EstimateTotals;
  taxMode?: TaxMode;
  onTaxModeChange?: (mode: TaxMode) => void;
  items?: EstimateLineItem[];
};

type GstSlab = {
  rate: number;
  taxable: number;
  tax: number;
};

const calculateGstSlabs = (items: EstimateLineItem[] = []): GstSlab[] => {
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

export const EstimateSummarySection = ({
  totals,
  taxMode = "CGST_SGST",
  onTaxModeChange,
  items = [],
}: EstimateSummarySectionProps) => {
  const slabs = calculateGstSlabs(items);
  const halfTax = Math.round((totals.tax / 2 + Number.EPSILON) * 100) / 100;
  const otherHalf = Math.round((totals.tax - halfTax + Number.EPSILON) * 100) / 100;

  return (
    <section className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      {/* Top Content: Header, Summary Rows, and GST Breakdown */}
      <div>
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
            aria-hidden="true"
          >
            <Calculator size={19} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
              Estimate Summary
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Review the quotation totals and tax details.
            </p>
          </div>
        </div>

        {/* Summary rows */}
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

          <div className="flex items-center justify-between text-text-secondary">
            <span>Taxable Amount</span>
            <span className="font-medium text-text-primary tabular-nums">
              {formatCurrencyExact(totals.taxable)}
            </span>
          </div>
        </div>

        {/* GST Tax Treatment & Breakdown Card */}
        <div className="mt-5 rounded-lg border border-border/60 bg-surface-alt/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              GST Calculation
            </span>
            {onTaxModeChange ? (
              <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-[11px]">
                <Button
                  type="button"
                  variant={taxMode === "CGST_SGST" ? "primary" : "secondary"}
                  onClick={() => onTaxModeChange("CGST_SGST")}
                  className={cn(
                    "h-7 px-2 text-xs font-medium border-0",
                    taxMode !== "CGST_SGST" &&
                      "bg-transparent text-text-secondary hover:text-text-primary",
                  )}
                >
                  CGST + SGST
                </Button>
                <Button
                  type="button"
                  variant={taxMode === "IGST" ? "primary" : "secondary"}
                  onClick={() => onTaxModeChange("IGST")}
                  className={cn(
                    "h-7 px-2 text-xs font-medium border-0",
                    taxMode !== "IGST" &&
                      "bg-transparent text-text-secondary hover:text-text-primary",
                  )}
                >
                  IGST
                </Button>
              </div>
            ) : (
              <span className="rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                {taxMode === "CGST_SGST" ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}
              </span>
            )}
          </div>

          {taxMode === "CGST_SGST" ? (
            <div className="space-y-1.5 text-xs text-text-secondary pt-1">
              <div className="flex items-center justify-between">
                <span>Central GST (CGST)</span>
                <span className="font-mono text-text-primary tabular-nums">
                  {formatCurrencyExact(totals.cgst ?? halfTax)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>State GST (SGST)</span>
                <span className="font-mono text-text-primary tabular-nums">
                  {formatCurrencyExact(totals.sgst ?? otherHalf)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
              <span>Integrated GST (IGST)</span>
              <span className="font-mono text-text-primary tabular-nums">
                {formatCurrencyExact(totals.igst ?? totals.tax)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs font-medium text-text-primary">
            <span>Total Tax</span>
            <span className="tabular-nums text-primary-light">
              {formatCurrencyExact(totals.tax)}
            </span>
          </div>

          {/* Slabs summary if multiple rates present */}
          {slabs.length > 0 && (
            <div className="border-t border-border/40 pt-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1 mb-1.5">
                <Percent size={11} /> Rate Slabs Breakdown
              </span>
              <div className="space-y-1">
                {slabs.map((slab) => (
                  <div key={slab.rate} className="flex justify-between text-[11px] text-text-muted">
                    <span>
                      @{slab.rate}% on {formatCurrencyExact(slab.taxable)}
                    </span>
                    <span className="font-mono tabular-nums text-text-secondary">
                      {formatCurrencyExact(slab.tax)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Final Estimate Total */}
      <div className="mt-6 rounded-lg border border-border/80 bg-surface-alt/60 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Estimated Total
            </p>
            <p className="text-[11px] text-text-muted">Total proposed value</p>
          </div>
          <div className="text-right">
            <span className="font-heading text-2xl font-bold tracking-tight text-text-primary tabular-nums">
              {formatCurrencyExact(totals.total)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
