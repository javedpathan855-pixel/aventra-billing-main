"use client";

import { Calculator } from "lucide-react";
import type { ChallanLineState } from "./DeliveryChallanItemsSection";

export type DeliveryChallanSummarySectionProps = {
  items: ChallanLineState[];
  challanNumberPreview: string;
};

export const DeliveryChallanSummarySection = ({
  items,
  challanNumberPreview,
}: DeliveryChallanSummarySectionProps) => {
  let totalOrdered = 0;
  let totalDelivered = 0;

  for (const it of items) {
    totalOrdered += Number(it.orderedQuantity) || 0;
    totalDelivered += parseFloat(it.deliveredQuantity) || 0;
  }

  const totalPending = Math.max(0, totalOrdered - totalDelivered);
  const roundedOrdered = Number(totalOrdered.toFixed(3));
  const roundedDelivered = Number(totalDelivered.toFixed(3));
  const roundedPending = Number(totalPending.toFixed(3));

  return (
    <section className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      {/* Top Content: Header and Quantity Breakdown */}
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
              Dispatch Summary
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Review dispatch quantities before generating the challan.
            </p>
          </div>
        </div>

        {/* Quantity Breakdown */}
        <div className="mt-5 space-y-2.5 text-xs">
          <div className="flex justify-between text-text-secondary">
            <span>Document Number</span>
            <span className="font-mono text-text-primary">{challanNumberPreview}</span>
          </div>

          <div className="flex justify-between text-text-secondary">
            <span>Total Lines</span>
            <span className="font-mono text-text-primary">{items.length}</span>
          </div>

          <div className="border-t border-border/80 pt-2 flex justify-between font-medium text-text-primary">
            <span>Total Ordered Qty</span>
            <span className="font-mono">{roundedOrdered}</span>
          </div>

          <div className="flex justify-between text-text-secondary">
            <span>Total Dispatch Qty</span>
            <span className="font-mono">{roundedDelivered}</span>
          </div>
        </div>
      </div>

      {/* Total Card Footer */}
      <div className="mt-6 border-t border-border/80 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-text-primary">
            Remaining Balance:
          </span>
          <span className="text-2xl font-bold font-mono text-text-primary">
            {roundedPending}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">
          Ordered vs dispatched across all lines • Non-financial dispatch document
        </p>
      </div>
    </section>
  );
};
