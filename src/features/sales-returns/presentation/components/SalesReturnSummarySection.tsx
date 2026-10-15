"use client";

import { Calculator } from "lucide-react";
import { Button } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import { formatCurrency } from "@/shared/lib/money";

export type SalesReturnTotals = {
  subtotal: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
};

export type SalesReturnSummarySectionProps = {
  totals: SalesReturnTotals;
  taxMode?: string;
  onTaxModeChange?: (mode: string) => void;
  currency?: string;
};

export const SalesReturnSummarySection = ({
  totals,
  taxMode = "CGST_SGST",
  onTaxModeChange,
  currency = "INR (₹)",
}: SalesReturnSummarySectionProps) => {
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
              Review return value and tax adjustments.
            </p>
          </div>
        </div>

        {/* Financial Line-Items Breakdown */}
        <div className="mt-5 space-y-2.5 text-xs">
          <div className="flex justify-between text-text-secondary">
            <span>Gross Subtotal</span>
            <span className="font-mono text-text-primary">
              {formatCurrency(totals.subtotal)}
            </span>
          </div>

          <div className="border-t border-border/80 pt-2 flex justify-between font-medium text-text-primary">
            <span>Taxable Amount</span>
            <span className="font-mono">
              {formatCurrency(totals.subtotal)}
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
                  : taxMode === "IGST"
                  ? "Inter-State (IGST)"
                  : "Tax Exempt"}
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

        {/* GST Tax Rows */}
        <div className="mt-3 space-y-2 text-xs">
          {taxMode === "IGST" ? (
            <div className="flex justify-between text-text-secondary pt-2">
              <span>IGST (Integrated Tax)</span>
              <span className="font-mono">{formatCurrency(totals.igst)}</span>
            </div>
          ) : taxMode === "CGST_SGST" ? (
            <>
              <div className="flex justify-between text-text-secondary pt-2">
                <span>CGST (Central Tax)</span>
                <span className="font-mono">{formatCurrency(totals.cgst)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>SGST (State Tax)</span>
                <span className="font-mono">{formatCurrency(totals.sgst)}</span>
              </div>
            </>
          ) : null}

          <div className="border-t border-border/80 pt-2 flex justify-between font-medium text-text-primary">
            <span>Total Tax</span>
            <span className="font-mono">{formatCurrency(totals.taxAmount)}</span>
          </div>
        </div>
      </div>

      {/* Total Card Footer */}
      <div className="mt-6 border-t border-border/80 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-text-primary">
            Total Return Value:
          </span>
          <span className="text-2xl font-bold font-mono text-text-primary">
            {formatCurrency(totals.totalAmount)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">
          Currency: {currency} • Eligible for Credit Note refund
        </p>
      </div>
    </section>
  );
};
