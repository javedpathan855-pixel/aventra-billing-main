"use client";

import { FileText } from "lucide-react";
import type { ChangeEvent } from "react";
import { Label, Textarea } from "@/shared/components/form";

export type DeliveryChallanAdditionalInfoSectionProps = {
  notes: string;
  onNotesChange: (val: string) => void;
  terms: string;
  onTermsChange: (val: string) => void;
};

export const DeliveryChallanAdditionalInfoSection = ({
  notes,
  onNotesChange,
  terms,
  onTermsChange,
}: DeliveryChallanAdditionalInfoSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <FileText size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Delivery Notes &amp; Terms
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Handling instructions, acknowledgement and delivery conditions.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="delivery-challan-notes"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Delivery &amp; Packaging Notes
          </Label>
          <Textarea
            id="delivery-challan-notes"
            rows={4}
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              onNotesChange(e.target.value)
            }
            placeholder="Enter handling notes, receiver instructions..."
            className="min-h-24 px-3.5 py-2.5 text-sm"
          />
        </div>
        <div>
          <Label
            htmlFor="delivery-challan-terms"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Terms &amp; Acknowledgement Conditions
          </Label>
          <Textarea
            id="delivery-challan-terms"
            rows={4}
            value={terms}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              onTermsChange(e.target.value)
            }
            placeholder="Enter inspection and delivery terms..."
            className="min-h-24 px-3.5 py-2.5 text-sm"
          />
        </div>
      </div>
    </section>
  );
};
