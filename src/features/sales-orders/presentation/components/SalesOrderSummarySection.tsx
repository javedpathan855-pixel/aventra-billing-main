import { Calculator, Percent } from "lucide-react";
import { Button } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type {
  SalesOrderItem,
  SalesOrderTotals,
} from "../../domain/entities/sales-order";

const formatCurrencyExact = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export type SalesOrderSummarySectionProps = {
  totals: SalesOrderTotals;
  taxMode?: "CGST_SGST" | "IGST";
  onTaxModeChange?: (mode: "CGST_SGST" | "IGST") => void;
  items?: SalesOrderItem[];
};

export const SalesOrderSummarySection = ({
  totals,
  taxMode = "CGST_SGST",
  onTaxModeChange,
}: SalesOrderSummarySectionProps) => {
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
              Order Summary
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Review order totals and tax distribution.
            </p>
          </div>
        </div>

        {/* Financial Line-Items Breakdown */}
        <div className="mt-5 space-y-2.5 text-xs">
          <div className="flex justify-between text-text-secondary">
            <span>Gross Subtotal</span>
            <span className="font-mono text-text-primary">
              {formatCurrencyExact(totals.subtotal)}
            </span>
          </div>

          {totals.lineDiscountTotal > 0 && (
            <div className="flex justify-between text-success">
              <span>Line Discounts</span>
              <span className="font-mono">
                −{formatCurrencyExact(totals.lineDiscountTotal)}
              </span>
            </div>
          )}

          {totals.effectiveAdditionalDiscount > 0 && (
            <div className="flex justify-between text-success">
              <span>Order Discount</span>
              <span className="font-mono">
                −{formatCurrencyExact(totals.effectiveAdditionalDiscount)}
              </span>
            </div>
          )}

          {totals.additionalCharges > 0 && (
            <div className="flex justify-between text-text-secondary">
              <span>Additional Charges</span>
              <span className="font-mono text-text-primary">
                +{formatCurrencyExact(totals.additionalCharges)}
              </span>
            </div>
          )}

          <div className="border-t border-border/80 pt-2 flex justify-between font-medium text-text-primary">
            <span>Taxable Amount</span>
            <span className="font-mono">
              {formatCurrencyExact(totals.taxableAmount)}
            </span>
          </div>
        </div>

        {/* GST Calculation Mode Switcher */}
        {onTaxModeChange && (
          <div className="mt-4 rounded-lg border border-border/70 bg-surface-alt/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                GST Tax Mode
              </span>
              <span className="text-[11px] text-text-muted">
                {taxMode === "CGST_SGST"
                  ? "Intra-State (CGST + SGST)"
                  : "Inter-State (IGST)"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border/60 bg-surface-card p-1">
              <Button
                type="button"
                variant={taxMode === "CGST_SGST" ? "primary" : "secondary"}
                onClick={() => onTaxModeChange("CGST_SGST")}
                className={cn(
                  "h-8 px-2 text-xs font-medium border-0",
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
                  "h-8 px-2 text-xs font-medium border-0",
                  taxMode !== "IGST" &&
                    "bg-transparent text-text-secondary hover:text-text-primary",
                )}
              >
                IGST
              </Button>
            </div>
          </div>
        )}

        {/* GST Slabs Table */}
        {totals.taxBreakdown.length > 0 && (
          <div className="mt-4 rounded-lg border border-border/60 bg-surface-alt/30 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              <Percent size={12} className="text-primary-light" />
              <span>Tax Breakdown by Slab</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {totals.taxBreakdown.map((slab) => (
                <div
                  key={slab.rate}
                  className="flex items-center justify-between text-text-secondary"
                >
                  <span className="font-mono">{slab.rate}% Slab</span>
                  <span className="font-mono text-text-muted">
                    on {formatCurrencyExact(slab.taxableAmount)}
                  </span>
                  <span className="font-mono font-medium text-text-primary">
                    {formatCurrencyExact(slab.taxAmount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2.5 border-t border-border/60 pt-2 space-y-1 text-xs">
              {taxMode === "CGST_SGST" ? (
                <>
                  <div className="flex justify-between text-text-secondary">
                    <span>CGST Total</span>
                    <span className="font-mono text-text-primary">
                      {formatCurrencyExact(totals.cgst)}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>SGST Total</span>
                    <span className="font-mono text-text-primary">
                      {formatCurrencyExact(totals.sgst)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-text-secondary">
                  <span>IGST Total</span>
                  <span className="font-mono text-text-primary">
                    {formatCurrencyExact(totals.igst)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Grand Total Card */}
      <div className="mt-5 rounded-xl border border-primary/30 bg-surface-alt/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
              Final Order Total
            </span>
            <span className="text-xs text-text-muted">
              Inclusive of all taxes &amp; fees
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
              {formatCurrencyExact(totals.total)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
