import { Calculator, Percent } from "lucide-react";
import { Button } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";

export type PurchaseReturnSummary = {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type PurchaseReturnSummarySectionProps = {
  totals: PurchaseReturnSummary;
  taxMode?: "CGST_SGST" | "IGST";
  onTaxModeChange?: (mode: "CGST_SGST" | "IGST") => void;
};

const formatCurrencyExact = (val: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

/**
 * Returned-goods totals. Returns carry no document-level discounts or
 * charges (mirroring sales returns): the header totals are the sums of the
 * returned line values, split into CGST/SGST or IGST for display.
 */
export const PurchaseReturnSummarySection = ({
  totals,
  taxMode = "CGST_SGST",
  onTaxModeChange,
}: PurchaseReturnSummarySectionProps) => {
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
              Return Summary
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Value of goods sent back to the supplier.
            </p>
          </div>
        </div>

        {/* Summary rows */}
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between text-text-secondary">
            <span>Returned Subtotal</span>
            <span className="font-medium text-text-primary tabular-nums">
              {formatCurrencyExact(totals.subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-text-secondary">
            <span>Tax Amount</span>
            <span className="font-medium text-text-primary tabular-nums">
              {formatCurrencyExact(totals.taxAmount)}
            </span>
          </div>
        </div>

        {/* GST Summary Sub-Card */}
        <div className="mt-5 rounded-lg border border-border/80 bg-surface-alt/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Percent size={14} className="text-primary-light" />
              <span className="text-xs font-semibold text-text-primary">
                GST Summary
              </span>
            </div>

            {onTaxModeChange ? (
              <div className="flex rounded-md border border-border/70 bg-surface p-0.5 text-[10px]">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => onTaxModeChange("CGST_SGST")}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium no-underline",
                    taxMode === "CGST_SGST"
                      ? "bg-primary text-primary-foreground shadow-xs hover:text-primary-foreground"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  CGST+SGST
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => onTaxModeChange("IGST")}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-medium no-underline",
                    taxMode === "IGST"
                      ? "bg-primary text-primary-foreground shadow-xs hover:text-primary-foreground"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  IGST
                </Button>
              </div>
            ) : (
              <span className="text-[10px] font-medium text-text-muted">
                {taxMode === "IGST"
                  ? "IGST (Inter-state)"
                  : "CGST + SGST (Intra-state)"}
              </span>
            )}
          </div>

          {/* Tax Components */}
          <div className="space-y-1.5 text-xs pt-1 border-t border-border/50">
            {taxMode === "CGST_SGST" ? (
              <>
                <div className="flex items-center justify-between text-text-secondary">
                  <span>Central GST (CGST)</span>
                  <span className="font-medium text-text-primary tabular-nums">
                    {formatCurrencyExact(totals.cgst)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span>State GST (SGST)</span>
                  <span className="font-medium text-text-primary tabular-nums">
                    {formatCurrencyExact(totals.sgst)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-text-secondary">
                <span>Integrated GST (IGST)</span>
                <span className="font-medium text-text-primary tabular-nums">
                  {formatCurrencyExact(totals.igst)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Total - Pinned to bottom */}
      <div className="border-t border-border pt-4 mt-6 flex items-baseline justify-between">
        <span className="font-heading text-base font-semibold text-text-primary">
          Return Total
        </span>
        <span className="font-heading text-2xl font-bold tracking-tight text-primary-light tabular-nums">
          {formatCurrencyExact(totals.totalAmount)}
        </span>
      </div>
    </section>
  );
};
