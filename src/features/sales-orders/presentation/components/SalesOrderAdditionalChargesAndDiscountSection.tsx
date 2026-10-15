import { BadgePercent, Tag, Truck } from "lucide-react";
import type { ChangeEvent } from "react";
import { Input, Label, Select } from "@/shared/components/form";

export type SalesOrderAdditionalChargesAndDiscountSectionProps = {
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

export const SalesOrderAdditionalChargesAndDiscountSection = ({
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
}: SalesOrderAdditionalChargesAndDiscountSectionProps) => {
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
              Add delivery fees, packaging charges, or apply an overall order discount.
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
                Freight, handling, packaging, or special logistics fees.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <Label
                    htmlFor="so-charges-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Charge Description
                  </Label>
                  <Input
                    id="so-charges-label"
                    type="text"
                    value={additionalChargesLabel}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onAdditionalChargesLabelChange(e.target.value)
                    }
                    placeholder="e.g. Express Freight"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="so-charges-amount"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Amount (₹)
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                      ₹
                    </span>
                    <Input
                      id="so-charges-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={additionalCharges === 0 ? "" : additionalCharges}
                      onChange={handleChargesInput}
                      placeholder="0.00"
                      className="h-9 pl-6 text-right font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 border-t border-border/60 pt-2 text-[11px] text-text-muted">
              Added to order subtotal before final tax computation.
            </div>
          </div>

          {/* Panel 2: Overall Order Discount */}
          <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-surface-alt/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-primary-light" />
                <h3 className="text-sm font-semibold text-text-primary">Overall Discount</h3>
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">
                Commercial discount applied across the order.
              </p>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label
                      htmlFor="so-discount-type"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      Discount Type
                    </Label>
                    <Select
                      id="so-discount-type"
                      value={additionalDiscountType}
                      onChange={(val: string) =>
                        onAdditionalDiscountTypeChange(
                          val === "percentage" ? "percentage" : "fixed",
                        )
                      }
                      options={[
                        { value: "fixed", label: "Fixed (₹)" },
                        { value: "percentage", label: "Percent (%)" },
                      ]}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="so-discount-amount"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      {additionalDiscountType === "percentage"
                        ? "Rate (%)"
                        : "Amount (₹)"}
                    </Label>
                    <div className="relative">
                      {additionalDiscountType === "fixed" ? (
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                          ₹
                        </span>
                      ) : (
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                          %
                        </span>
                      )}
                      <Input
                        id="so-discount-amount"
                        type="number"
                        min="0"
                        max={additionalDiscountType === "percentage" ? 100 : undefined}
                        step={additionalDiscountType === "percentage" ? "0.1" : "0.01"}
                        value={additionalDiscount === 0 ? "" : additionalDiscount}
                        onChange={handleDiscountInput}
                        placeholder="0.00"
                        className={`h-9 font-mono text-xs ${
                          additionalDiscountType === "fixed"
                            ? "pl-6 text-right"
                            : "pr-6 text-right"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="so-discount-label"
                    className="mb-1.5 block text-xs font-medium text-text-secondary"
                  >
                    Reason / Code (Optional)
                  </Label>
                  <Input
                    id="so-discount-label"
                    type="text"
                    value={additionalDiscountLabel}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onAdditionalDiscountLabelChange(e.target.value)
                    }
                    placeholder="e.g. VIP Volume Discount"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 border-t border-border/60 pt-2 text-[11px] text-text-muted">
              Prorated proportionally across order line items.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
