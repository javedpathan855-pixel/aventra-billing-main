import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Input, Button, Label, FieldError } from "@/shared/components/form";
import type { SalesOpportunity } from "../../domain/entities/sales-opportunity";

export interface MarkLostModalProps {
  isOpen: boolean;
  opportunity: SalesOpportunity | null;
  onClose: () => void;
  onConfirm: (opportunityId: string, lossReason: string) => Promise<{ success: boolean; error?: string }>;
}

export const MarkLostModal = ({
  isOpen,
  opportunity,
  onClose,
  onConfirm,
}: MarkLostModalProps) => {
  const [lossReason, setLossReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !opportunity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lossReason.trim()) {
      setErrorMessage("Please enter a valid loss reason.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onConfirm(opportunity.id, lossReason.trim());
    setIsSubmitting(false);

    if (res.success) {
      setLossReason("");
      onClose();
    } else {
      setErrorMessage(res.error || "Failed to mark opportunity as lost.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircle size={20} />
            <h3 className="text-base font-bold text-text-primary">Mark Deal as Lost</h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 rounded-full"
            aria-label="Close"
          >
            <X size={14} />
          </Button>
        </div>

        <p className="mt-2 text-sm text-text-muted">
          Marking <span className="font-semibold text-text-primary">{opportunity.title}</span> as lost requires documenting why the opportunity was closed.
        </p>

        {errorMessage && (
          <div className="mt-3 rounded-lg bg-danger/10 p-2.5 text-xs text-danger border border-danger/20">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <div>
            <Label htmlFor="loss-reason-input">Reason for Loss *</Label>
            <Input
              id="loss-reason-input"
              type="text"
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              placeholder="e.g. Price too high, Chose Competitor ABC, Project cancelled"
              className="mt-1 h-10 text-sm"
              required
              autoFocus
            />
            <FieldError id="loss-reason-err" message={!lossReason.trim() && errorMessage ? errorMessage : undefined} />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || !lossReason.trim()}
              className="h-10 px-4 text-sm font-medium bg-danger hover:bg-danger/90 text-status-foreground border-none"
            >
              {isSubmitting ? "Updating..." : "Confirm Deal Lost"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
