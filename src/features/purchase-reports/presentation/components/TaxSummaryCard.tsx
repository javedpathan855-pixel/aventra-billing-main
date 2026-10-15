import { formatCurrency } from "@/shared/lib/money";
import type { PurchaseTaxSummary } from "../../domain/entities/purchase-report";

export type TaxSummaryCardProps = {
  tax: PurchaseTaxSummary;
};

const rowClassName = "flex items-center justify-between text-sm";
const labelClassName = "text-text-secondary";
const valueClassName = "font-medium text-text-primary tabular-nums font-mono";

export const TaxSummaryCard = ({ tax }: TaxSummaryCardProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Input Tax Summary
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          GST on confirmed bills, less tax on completed returns.
        </p>
      </div>

      <dl className="space-y-2.5">
        <div className={rowClassName}>
          <dt className={labelClassName}>Gross purchases</dt>
          <dd className={valueClassName}>{formatCurrency(tax.grossPurchases)}</dd>
        </div>
        <div className={rowClassName}>
          <dt className={labelClassName}>Central GST (CGST)</dt>
          <dd className={valueClassName}>{formatCurrency(tax.cgst)}</dd>
        </div>
        <div className={rowClassName}>
          <dt className={labelClassName}>State GST (SGST)</dt>
          <dd className={valueClassName}>{formatCurrency(tax.sgst)}</dd>
        </div>
        <div className={rowClassName}>
          <dt className={labelClassName}>Integrated GST (IGST)</dt>
          <dd className={valueClassName}>{formatCurrency(tax.igst)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-sm">
          <dt className="font-medium text-text-primary">Input tax (gross)</dt>
          <dd className="font-mono font-semibold text-text-primary tabular-nums">
            {formatCurrency(tax.inputTax)}
          </dd>
        </div>
        <div className={rowClassName}>
          <dt className={labelClassName}>
            Less: tax on completed returns ({formatCurrency(tax.returnsTotal)})
          </dt>
          <dd className={valueClassName}>−{formatCurrency(tax.returnsTax)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-sm">
          <dt className="font-medium text-text-primary">Net input tax</dt>
          <dd className="font-mono font-semibold text-primary-light tabular-nums">
            {formatCurrency(tax.netTax)}
          </dd>
        </div>
      </dl>
    </section>
  );
};
