import { BadgePercent, Tag, Truck } from "lucide-react";
import type { ChangeEvent } from "react";
import { Input, Label, Select } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";

export type EstimateAdditionalChargesAndDiscountSectionProps = {
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

export const EstimateAdditionalChargesAndDiscountSection = ({
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
}: EstimateAdditionalChargesAndDiscountSectionProps) => {
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
              Add delivery fees, packaging charges, or apply an overall quote discount.
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
                <h3 className="text-sm font-semibold text-text-primary">Additional Charges</h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Shipping, handling, packaging, or extra service fees.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <Label
                    htmlFor="estimate-charges-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Charge Description
                  </Label>
                  <Input
                    id="estimate-charges-label"
                    type="text"
                    value={additionalChargesLabel}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onAdditionalChargesLabelChange(e.target.value)
                    }
                    placeholder="e.g. Shipping / Delivery"
                    className="h-9 px-3 text-sm"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="estimate-charges-amount"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Amount (₹)
                  </Label>
                  <Input
                    id="estimate-charges-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={additionalCharges === 0 ? "" : additionalCharges}
                    onChange={handleChargesInput}
                    placeholder="0.00"
                    startIcon={<span className="text-xs">₹</span>}
                    className="h-9 text-sm tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-text-secondary">
              <span>Applied Charge:</span>
              <span className="font-semibold text-text-primary tabular-nums">
                ₹{Number(additionalCharges || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Panel 2: Additional Discount */}
          <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface-alt/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-primary-light" />
                <h3 className="text-sm font-semibold text-text-primary">Overall Discount</h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Apply a flat-rate or percentage discount to the entire quote.
              </p>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label
                      htmlFor="estimate-discount-type"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      Discount Type
                    </Label>
                    <Select
                      id="estimate-discount-type"
                      value={additionalDiscountType}
                      onChange={(val) =>
                        onAdditionalDiscountTypeChange(val as "percentage" | "fixed")
                      }
                      className="h-9 text-xs"
                    >
                      <option value="fixed">Fixed Amount (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="estimate-discount-value"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      Value
                    </Label>
                    <div className="relative">
                      <Input
                        id="estimate-discount-value"
                        type="number"
                        min="0"
                        max={additionalDiscountType === "percentage" ? "100" : undefined}
                        step={additionalDiscountType === "percentage" ? "1" : "0.01"}
                        value={additionalDiscount === 0 ? "" : additionalDiscount}
                        onChange={handleDiscountInput}
                        placeholder="0"
                        startIcon={
                          additionalDiscountType === "fixed" ? (
                            <span className="text-xs">₹</span>
                          ) : undefined
                        }
                        className={cn("h-9 text-sm tabular-nums", additionalDiscountType === "percentage" && "pr-7")}
                      />
                      {additionalDiscountType === "percentage" && (
                        <span
                          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted"
                          aria-hidden="true"
                        >
                          %
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="estimate-discount-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Discount Description
                  </Label>
                  <Input
                    id="estimate-discount-label"
                    type="text"
                    value={additionalDiscountLabel}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onAdditionalDiscountLabelChange(e.target.value)
                    }
                    placeholder="e.g. Volume discount, Partner offer"
                    className="h-9 px-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-text-secondary">
              <span>Applied Discount:</span>
              <span className="font-semibold text-text-primary tabular-nums">
                {additionalDiscountType === "percentage"
                  ? `${additionalDiscount || 0}%`
                  : `₹${Number(additionalDiscount || 0).toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
