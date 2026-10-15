"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Pencil, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/form/Button";
import {
  formatDebitNoteCurrency,
  formatDebitNoteDate,
  calculateDebitNoteTotals,
  type DebitNote,
} from "../../domain/debit-note";
import { DebitNoteDocument } from "../components/DebitNoteDocument";
import { DebitNoteStatusBadge } from "../components/DebitNoteStatusBadge";
import {
  deleteDebitNoteAction,
  issueDebitNoteAction,
} from "../../data/mutations/debit-note-mutations";

export type DebitNoteDetailPageProps = {
  initialDebitNote?: DebitNote | null;
  supplierName?: string;
};

export const DebitNoteDetailPage = ({
  initialDebitNote,
  supplierName,
}: DebitNoteDetailPageProps) => {
  const router = useRouter();
  const [debitNote, setDebitNote] = useState<DebitNote | null | undefined>(
    initialDebitNote,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!debitNote) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Debit note not found
        </h1>
        <p className="mx-auto mt-2 max-w-md text-text-secondary">
          The requested debit note does not exist or does not belong to your organization.
        </p>
        <Link
          href="/debit-notes"
          className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
        >
          <ArrowLeft size={17} />
          <span>Return to debit notes</span>
        </Link>
      </div>
    );
  }

  const totals = calculateDebitNoteTotals(debitNote);

  const handleIssue = async () => {
    if (!confirm("Are you sure you want to finalize and issue this debit note? Once issued, its financial values become immutable and the invoice receivable increases.")) {
      return;
    }

    setIsProcessing(true);
    setActionError(null);

    const result = await issueDebitNoteAction(debitNote.id);
    if (!result.success) {
      setActionError(result.error || "Failed to issue debit note.");
      setIsProcessing(false);
      return;
    }

    setDebitNote(result.data);
    setIsProcessing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this draft debit note? This action cannot be undone.")) {
      return;
    }

    setIsProcessing(true);
    setActionError(null);

    const result = await deleteDebitNoteAction(debitNote.id);
    if (!result.success) {
      setActionError(result.error || "Failed to delete debit note.");
      setIsProcessing(false);
      return;
    }

    router.push("/debit-notes");
  };

  return (
    <section className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/debit-notes"
            className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            <span>Back to debit notes</span>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold text-text-primary">
              {debitNote.debitNoteNumber}
            </h1>
            <DebitNoteStatusBadge status={debitNote.status} />
          </div>
          <p className="mt-2 text-text-secondary">
            {debitNote.customerName} · Issued {formatDebitNoteDate(debitNote.issueDate)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {debitNote.status === "Draft" ? (
            <>
              <Button
                variant="secondary"
                disabled={isProcessing}
                onClick={handleDelete}
                className="px-3 text-danger hover:text-danger-light"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </Button>

              <Link
                href={`/debit-notes/new?edit=${debitNote.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-alt px-3.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Pencil size={15} />
                <span>Edit Draft</span>
              </Link>

              <Button
                variant="primary"
                disabled={isProcessing}
                onClick={handleIssue}
                className="px-4"
              >
                <CheckCircle2 size={16} />
                <span>{isProcessing ? "Issuing..." : "Issue Debit Note"}</span>
              </Button>
            </>
          ) : (
            <>
              <Link
                href={`/invoices/${debitNote.invoiceId}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-alt px-3.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
              >
                <span>View Invoice ({debitNote.invoiceNumber || "Details"})</span>
              </Link>
              <Button
                variant="secondary"
                onClick={() => window.print()}
                className="px-4"
              >
                <Printer size={16} />
                <span>Print Document</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {actionError && (
        <div
          className="rounded-lg border border-error/40 bg-error/15 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {/* Financial Stat Tiles */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Debit Note Total</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatDebitNoteCurrency(totals.total)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Taxable Amount</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatDebitNoteCurrency(totals.taxable)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Total Tax Debited</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatDebitNoteCurrency(totals.tax)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Original Invoice</p>
          <Link
            href={`/invoices/${debitNote.invoiceId}`}
            className="mt-1 block font-heading text-xl font-bold text-primary-light hover:underline"
          >
            {debitNote.invoiceNumber || "Invoice"}
          </Link>
        </div>
      </div>

      {/* Rendered Document */}
      <DebitNoteDocument debitNote={debitNote} supplierName={supplierName} />
    </section>
  );
};
