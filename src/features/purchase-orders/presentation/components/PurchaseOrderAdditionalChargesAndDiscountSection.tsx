import { BadgePercent, Tag, Truck } from "lucide-react";
import type { ChangeEvent } from "react";
import { Button, Input, Label, Select } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";

export type PurchaseOrderAdditionalChargesAndDiscountSectionProps = {
  additionalCharges: number;
  onAdditionalChargesChange: (value: number) => void;
  additionalChargesLabel: string;
  onAdditionalChargesLabelChange: (value: string) => void;
  additionalDiscount: number;
  onAdditionalDiscountChange: (value: number) => void;
  additionalDiscountType: "percentage" | "fixed";
  onAdditionalDiscountTypeChange: (value: "percentage" | "fixed") => void;
  additionalDiscountLabel: string;
  onAdditionalDiscountLabelChange: (value: string) => void;
};

const chargePresets = ["Freight", "Packaging", "Handling", "Loading"];
const discountPresets = ["Volume Discount", "Loyalty", "Early Payment"];

const presetChipClassName =
  "rounded-md border border-border/70 bg-surface px-2 py-0.5 text-[11px] text-text-secondary hover:border-primary-light hover:text-text-primary";

export const PurchaseOrderAdditionalChargesAndDiscountSection = ({
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
}: PurchaseOrderAdditionalChargesAndDiscountSectionProps) => {
  const handleChargesInput = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseFloat(e.target.value);
    onAdditionalChargesChange(Number.isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  const handleDiscountInput = (e: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseFloat(e.target.value);
    onAdditionalDiscountChange(Number.isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  return (
    <section className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      <div className="flex h-full flex-col">
        {/* Section Header */}
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
              Add freight, packaging charges, or apply an overall order discount.
            </p>
          </div>
        </div>

        {/* Two balanced panels: Charges on Left, Discount on Right */}
        <div className="mt-5 grid flex-1 grid-cols-1 gap-5 md:grid-cols-2">
          {/* Panel 1: Additional Charges */}
          <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface-alt/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-primary-light" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Additional Charges
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Freight, handling, packaging, or extra supplier fees.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <Label
                    htmlFor="po-charges-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Charge Description
                  </Label>
                  <Input
                    id="po-charges-label"
                    type="text"
                    value={additionalChargesLabel}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onAdditionalChargesLabelChange(e.target.value)
                    }
                    placeholder="e.g. Freight, Packaging"
                    className="h-9 px-3 text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="po-charges-amount"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Amount (₹)
                  </Label>
                  <Input
                    id="po-charges-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={additionalCharges === 0 ? "" : additionalCharges}
                    onChange={handleChargesInput}
                    placeholder="0.00"
                    startIcon={<span className="text-xs">₹</span>}
                    className="h-9 text-sm tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Presets:</span>
              {chargePresets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="link"
                  onClick={() => onAdditionalChargesLabelChange(preset)}
                  className={cn(presetChipClassName)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Panel 2: Order Discount */}
          <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface-alt/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-primary-light" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Order Discount
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Apply a flat amount or percentage discount to the order.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <Label
                    htmlFor="po-discount-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Discount Reason
                  </Label>
                  <Input
                    id="po-discount-label"
                    type="text"
                    value={additionalDiscountLabel}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onAdditionalDiscountLabelChange(e.target.value)
                    }
                    placeholder="e.g. Volume discount"
                    className="h-9 px-3 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label
                      htmlFor="po-discount-type"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      Type
                    </Label>
                    <Select
                      id="po-discount-type"
                      value={additionalDiscountType}
                      onChange={(val) =>
                        onAdditionalDiscountTypeChange(
                          val as "percentage" | "fixed",
                        )
                      }
                      className="h-9 text-xs"
                    >
                      <option value="fixed">Fixed (₹)</option>
                      <option value="percentage">Percent (%)</option>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="po-discount-amount"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      {additionalDiscountType === "percentage"
                        ? "Rate (%)"
                        : "Amount (₹)"}
                    </Label>
                    <Input
                      id="po-discount-amount"
                      type="number"
                      min="0"
                      max={additionalDiscountType === "percentage" ? "100" : undefined}
                      step="any"
                      value={additionalDiscount === 0 ? "" : additionalDiscount}
                      onChange={handleDiscountInput}
                      placeholder="0.00"
                      className="h-9 px-3 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-text-muted">Presets:</span>
              {discountPresets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="link"
                  onClick={() => onAdditionalDiscountLabelChange(preset)}
                  className={cn(presetChipClassName)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
