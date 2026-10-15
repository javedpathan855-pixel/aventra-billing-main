"use client";

import { FileText } from "lucide-react";
import { Label, Select, Textarea } from "@/shared/components/form";

export type SupplierTermsNotesSectionProps = {
  paymentTerms: string;
  onPaymentTermsChange: (val: string) => void;
  internalNotes: string;
  onInternalNotesChange: (val: string) => void;
};

const paymentTermOptions = [
  { value: "", label: "No fixed terms" },
  { value: "Due on Receipt", label: "Due on Receipt" },
  { value: "Net 7 days", label: "Net 7 days" },
  { value: "Net 15 days", label: "Net 15 days" },
  { value: "Net 30 days", label: "Net 30 days" },
  { value: "Net 45 days", label: "Net 45 days" },
  { value: "Net 60 days", label: "Net 60 days" },
];

export const SupplierTermsNotesSection = ({
  paymentTerms,
  onPaymentTermsChange,
  internalNotes,
  onInternalNotesChange,
}: SupplierTermsNotesSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
          <FileText size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Commercial Terms &amp; Notes
          </h2>
          <p className="text-xs text-text-secondary">
            Agreed payment terms and internal remarks about this supplier.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="supplier-payment-terms" className="text-xs">
            Payment Terms
          </Label>
          <Select
            id="supplier-payment-terms"
            value={paymentTerms}
            onChange={onPaymentTermsChange}
            options={paymentTermOptions}
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supplier-notes" className="text-xs">
            Internal Notes
          </Label>
          <Textarea
            id="supplier-notes"
            value={internalNotes}
            onChange={(e) => onInternalNotesChange(e.target.value)}
            placeholder="Delivery performance, quality remarks..."
            rows={3}
            className="text-sm"
          />
        </div>
      </div>
    </section>
  );
};
