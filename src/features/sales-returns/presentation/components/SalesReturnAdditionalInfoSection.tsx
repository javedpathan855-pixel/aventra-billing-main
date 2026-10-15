"use client";

import { FileText, ShieldCheck } from "lucide-react";
import type { ChangeEvent } from "react";
import { Label, Textarea } from "@/shared/components/form";

export type SalesReturnAdditionalInfoSectionProps = {
  notes: string;
  onNotesChange: (val: string) => void;
};

export const SalesReturnAdditionalInfoSection = ({
  notes,
  onNotesChange,
}: SalesReturnAdditionalInfoSectionProps) => {
  return (
    <section className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      <div>
        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
            aria-hidden="true"
          >
            <FileText size={19} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
              Return Terms &amp; Policy Notes
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Specify organizational return conditions, warranty clauses, or customer remarks.
            </p>
          </div>
        </div>

        {/* Notes & Terms Content */}
        <div className="mt-5 space-y-4">
          <div>
            <Label
              htmlFor="sales-return-policy"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Return Policy &amp; Terms
            </Label>
            <Textarea
              id="sales-return-policy"
              rows={4}
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                onNotesChange(e.target.value)
              }
              placeholder="Enter return policies, inspection terms, or credit note conditions..."
              className="min-h-24 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="rounded-xl border border-success/20 bg-success/5 p-4 flex items-start gap-3 text-xs text-success">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
            <div className="space-y-1">
              <span className="font-semibold block text-success">
                Automatic Credit Note Integration
              </span>
              <p className="text-text-secondary leading-relaxed">
                Approving this return creates an associated Credit Note with verified GST tax distribution and records inventory restocking dispositions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
