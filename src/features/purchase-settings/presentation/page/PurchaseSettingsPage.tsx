import { Info } from "lucide-react";
import type { PurchaseSettings } from "../../domain/entities/purchase-settings";
import { PurchaseSettingsHeader } from "../components/PurchaseSettingsHeader";
import { PurchaseSettingsForm } from "../forms/PurchaseSettingsForm";

export type PurchaseSettingsPageProps = {
  initialSettings: PurchaseSettings;
};

export const PurchaseSettingsPage = ({
  initialSettings,
}: PurchaseSettingsPageProps) => {
  return (
    <div className="space-y-6">
      <PurchaseSettingsHeader />

      <div className="rounded-xl border border-border/80 bg-surface-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-primary-light mt-0.5">
            <Info size={15} />
          </div>
          <div className="text-xs sm:text-sm">
            <h3 className="font-semibold text-text-primary">
              Independent Numbering &amp; Multi-Tenant Isolation
            </h3>
            <p className="mt-0.5 text-text-secondary leading-relaxed">
              Purchase orders maintain their own independent sequence counter,
              separate from sales and billing documents. Numbers are allocated
              safely with row-level database locking. Existing purchase orders
              are never renumbered when settings change.
            </p>
          </div>
        </div>
      </div>

      <PurchaseSettingsForm initialSettings={initialSettings} />
    </div>
  );
};
