import { FileText } from "lucide-react";
import { Label, Textarea } from "@/shared/components/form";

export type PurchaseBillAdditionalInfoSectionProps = {
  notes: string;
  onNotesChange: (value: string) => void;
  terms: string;
  onTermsChange: (value: string) => void;
};

export const PurchaseBillAdditionalInfoSection = ({
  notes,
  onNotesChange,
  terms,
  onTermsChange,
}: PurchaseBillAdditionalInfoSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <FileText size={18} className="text-primary-light" />
        <h2 className="text-base font-semibold text-text-primary">
          Additional Information
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="pb-notes-textarea">Notes for Supplier</Label>
          <Textarea
            id="pb-notes-textarea"
            rows={4}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Matching notes, delivery references, contact person..."
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pb-terms-textarea">Terms &amp; Conditions</Label>
          <Textarea
            id="pb-terms-textarea"
            rows={4}
            value={terms}
            onChange={(e) => onTermsChange(e.target.value)}
            placeholder="Matching, acceptance, and payment conditions..."
            className="mt-1.5"
          />
        </div>
      </div>
    </section>
  );
};
