"use client";

import { ShieldCheck } from "lucide-react";
import { Input, Label, Select } from "@/shared/components/form";
import type { SupplierGstTreatment } from "../../domain/entities/supplier";

export type SupplierTaxSectionProps = {
  gstTreatment: SupplierGstTreatment;
  onGstTreatmentChange: (val: SupplierGstTreatment) => void;
  gstin: string;
  onGstinChange: (val: string) => void;
  pan: string;
  onPanChange: (val: string) => void;
  currency: string;
  onCurrencyChange: (val: string) => void;
  gstinError?: string;
  panError?: string;
};

const gstTreatmentOptions = [
  { value: "REGISTERED_BUSINESS_REGULAR", label: "Registered Business (Regular)" },
  { value: "CONSUMER_UNREGISTERED", label: "Consumer / Unregistered" },
  { value: "OVERSEAS_EXPORT", label: "Overseas / Export" },
  { value: "SPECIAL_ECONOMIC_ZONE", label: "Special Economic Zone (SEZ)" },
  { value: "DEEMED_EXPORT", label: "Deemed Export" },
  { value: "COMPOSITION_SCHEME", label: "Composition Scheme" },
];

const currencyOptions = [
  { value: "INR (₹)", label: "INR (₹) — Indian Rupee" },
  { value: "USD ($)", label: "USD ($) — US Dollar" },
  { value: "EUR (€)", label: "EUR (€) — Euro" },
  { value: "AED (د.إ)", label: "AED — UAE Dirham" },
];

export const SupplierTaxSection = ({
  gstTreatment,
  onGstTreatmentChange,
  gstin,
  onGstinChange,
  pan,
  onPanChange,
  currency,
  onCurrencyChange,
  gstinError,
  panError,
}: SupplierTaxSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
          <ShieldCheck size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Tax &amp; Compliance
          </h2>
          <p className="text-xs text-text-secondary">
            GST registration details for input tax credit eligibility.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="supplier-gst-treatment" className="text-xs">
            GST Treatment <span className="text-danger">*</span>
          </Label>
          <Select
            id="supplier-gst-treatment"
            value={gstTreatment}
            onChange={(val) => onGstTreatmentChange(val as SupplierGstTreatment)}
            options={gstTreatmentOptions}
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supplier-currency" className="text-xs">
            Currency <span className="text-danger">*</span>
          </Label>
          <Select
            id="supplier-currency"
            value={currency}
            onChange={onCurrencyChange}
            options={currencyOptions}
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supplier-gstin" className="text-xs">
            GSTIN
          </Label>
          <Input
            id="supplier-gstin"
            value={gstin}
            onChange={(e) => onGstinChange(e.target.value)}
            placeholder="27ABCDE1234F1Z5"
            maxLength={20}
            aria-invalid={Boolean(gstinError)}
            className="h-10 font-mono text-sm uppercase"
          />
          {gstinError ? (
            <p className="text-xs text-danger" role="alert">
              {gstinError}
            </p>
          ) : (
            <p className="text-xs text-text-muted">
              Required for registered businesses; PAN auto-fills from GSTIN.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supplier-pan" className="text-xs">
            PAN
          </Label>
          <Input
            id="supplier-pan"
            value={pan}
            onChange={(e) => onPanChange(e.target.value)}
            placeholder="ABCDE1234F"
            maxLength={15}
            aria-invalid={Boolean(panError)}
            className="h-10 font-mono text-sm uppercase"
          />
          {panError && (
            <p className="text-xs text-danger" role="alert">
              {panError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
