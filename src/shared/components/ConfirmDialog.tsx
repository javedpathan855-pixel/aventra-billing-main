"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "./form/Button";
import { cn } from "../utils/cn";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Shared in-house confirmation dialog for destructive or consequential
 * actions. Rendered inline (no portal) with a fixed overlay; closes on
 * Escape or overlay click, moves focus to the confirm action on open, and
 * uses semantic color tokens only.
 */
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isConfirming = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const Icon = variant === "danger" ? AlertTriangle : Info;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-description" : undefined}
        className="w-full max-w-md rounded-xl border border-border bg-surface-card p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
              variant === "danger"
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-border bg-surface-alt text-primary-light",
            )}
            aria-hidden="true"
          >
            <Icon size={19} />
          </div>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-text-primary"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-dialog-description"
                className="mt-1 text-sm text-text-secondary"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isConfirming}
            onClick={onClose}
            className="h-10 px-4 text-sm"
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant="primary"
            disabled={isConfirming}
            onClick={onConfirm}
            className={cn(
              "h-10 px-4 text-sm",
              variant === "danger" && "bg-danger hover:bg-danger/90",
            )}
          >
            {isConfirming ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
