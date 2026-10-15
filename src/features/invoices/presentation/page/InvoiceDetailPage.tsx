"use client";

import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Printer, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/form/Button";
import { cn } from "@/shared/utils/cn";
import {
  calculateInvoiceTotals,
  canCancelInvoice,
  formatCurrency,
  formatInvoiceDate,
  resolveInvoiceDisplayStatus,
  type Invoice,
} from "../../domain/invoice";
import { useInvoiceWorkspace } from "../hooks/InvoiceWorkspaceProvider";
import { InvoiceDocument } from "../components/InvoiceDocument";
import { StatusBadge } from "../components/StatusBadge";
import {
  cancelInvoiceAction,
  deleteInvoiceAction,
  issueInvoiceAction,
} from "../../data/mutations/invoice-mutations";

export type RelatedCreditNoteSummary = {
  id: string;
  creditNoteNumber: string;
  issueDate: string;
  total: number;
  status: string;
};

export type RelatedDebitNoteSummary = {
  id: string;
  debitNoteNumber: string;
  issueDate: string;
  total: number;
  status: string;
};

export type RelatedPaymentSummary = {
  id: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  allocatedAmount: number;
  status: string;
};

export type InvoiceDetailPageProps = {
  initialInvoice?: Invoice | null;
  relatedCreditNotes?: RelatedCreditNoteSummary[];
  relatedDebitNotes?: RelatedDebitNoteSummary[];
  relatedPayments?: RelatedPaymentSummary[];
};

export const InvoiceDetailPage = ({
  initialInvoice,
  relatedCreditNotes = [],
  relatedDebitNotes = [],
  relatedPayments = [],
}: InvoiceDetailPageProps) => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getInvoice } = useInvoiceWorkspace();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(
    initialInvoice ?? (params?.id ? getInvoice(params.id) : undefined),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Invoice not found
        </h1>
        <p className="mx-auto mt-2 max-w-md text-text-secondary">
          The requested invoice does not exist or does not belong to your organization.
        </p>
        <Link
          href="/invoices"
          className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
        >
          <ArrowLeft size={17} />
          <span>Return to invoices</span>
        </Link>
      </div>
    );
  }

  const totals = calculateInvoiceTotals(invoice);
  // Effective cash received: legacy tender plus active payment allocations.
  const effectivePaid = invoice.amountPaid + (totals.allocatedCash ?? 0);
  const displayStatus = resolveInvoiceDisplayStatus({
    status: invoice.status,
    total: totals.total,
    amountPaid: invoice.amountPaid,
    creditedAmount: totals.creditedAmount ?? 0,
    debitedAmount: totals.debitedAmount ?? 0,
    dueDate: invoice.dueDate,
  });
  const cancellable = canCancelInvoice({
    status: invoice.status,
    amountPaid: invoice.amountPaid,
    allocatedCash: totals.allocatedCash ?? 0,
    creditedAmount: totals.creditedAmount ?? 0,
    debitedAmount: totals.debitedAmount ?? 0,
  });
  const recordable =
    invoice.status !== "Draft" &&
    invoice.status !== "Cancelled" &&
    totals.balance > 0;

  const runAction = async <T,>(
    label: string,
    action: () => Promise<{ success: boolean; error?: string; data?: T }>,
    onSuccess: (updated: T) => void,
  ) => {
    setIsProcessing(true);
    setActionError(null);
    const result = await action();
    if (!result.success || result.data === undefined || result.data === null) {
      setActionError(result.error || `${label} failed.`);
      setIsProcessing(false);
      return;
    }
    onSuccess(result.data);
    setIsProcessing(false);
    router.refresh();
  };

  const handleIssue = () => {
    if (
      !confirm(
        "Issue this draft invoice? The number is already allocated and issuance creates a receivable. This cannot be undone except by cancellation.",
      )
    ) {
      return;
    }
    void runAction("Issue", () => issueInvoiceAction(invoice.id), (updated) => {
      setInvoice(updated);
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this draft invoice? This action cannot be undone.")) {
      return;
    }
    void runAction("Delete", () => deleteInvoiceAction(invoice.id), () => {
      router.push("/invoices");
    });
  };

  const handleCancel = () => {
    if (
      !confirm(
        "Cancel this issued invoice? The document is preserved as cancelled history and can never be reissued.",
      )
    ) {
      return;
    }
    void runAction("Cancel", () => cancelInvoiceAction(invoice.id), (updated) => {
      setInvoice(updated);
    });
  };
  // DEF-003: credit eligibility is capped by the gross invoice total minus
  // prior issued credits — deliberately NOT reduced by cash received, so a
  // fully paid invoice can still receive a (refund) credit. Remaining
  // receivable (totals.balance) is a separate concept shown above.
  const remainingCreditable = Math.max(0, totals.total - (totals.creditedAmount ?? 0));
  const isEligibleForCredit =
    invoice.status !== "Draft" &&
    invoice.status !== "Cancelled" &&
    remainingCreditable > 0;
  // Debit eligibility mirrors the credit cap: cumulative issued debits may
  // not exceed the gross invoice total.
  const remainingDebitable = Math.max(0, totals.total - (totals.debitedAmount ?? 0));
  const isEligibleForDebit =
    invoice.status !== "Draft" &&
    invoice.status !== "Cancelled" &&
    remainingDebitable > 0;

  return (
    <section className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            <span>Back to invoices</span>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold text-text-primary">
              {invoice.number}
            </h1>
            <StatusBadge status={displayStatus} />
          </div>
          <p className="mt-2 text-text-secondary">
            {invoice.customer} · Due {formatInvoiceDate(invoice.dueDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {invoice.status === "Draft" && (
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
                href={`/invoices/new?edit=${invoice.id}`}
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
                <span>{isProcessing ? "Issuing..." : "Issue Invoice"}</span>
              </Button>
            </>
          )}
          {(invoice.status === "Issued" ||
            invoice.status === "Overdue" ||
            invoice.status === "Partially Paid") &&
            (cancellable ? (
              <Button
                variant="secondary"
                disabled={isProcessing}
                onClick={handleCancel}
                className="px-3.5"
              >
                <Ban size={15} />
                <span>Cancel Invoice</span>
              </Button>
            ) : (
              <span
                title="Cancellation is blocked once payments or credit/debit adjustments are recorded. Adjust through those workflows instead."
                className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-border/60 px-3.5 text-sm font-medium text-text-muted opacity-60"
                aria-disabled="true"
              >
                <Ban size={15} />
                <span>Cancel Unavailable</span>
              </span>
            ))}
          {recordable && (
            <Link
              href={`/payments/new?invoiceId=${invoice.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span>Record Payment</span>
            </Link>
          )}
          {isEligibleForCredit && (
            <Link
              href={`/credit-notes/new?invoiceId=${invoice.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-alt px-3.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span>Create Credit Note</span>
            </Link>
          )}
          {isEligibleForDebit && (
            <Link
              href={`/debit-notes/new?invoiceId=${invoice.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-alt px-3.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span>Create Debit Note</span>
            </Link>
          )}
          <Button variant="secondary" onClick={() => window.print()} className="px-4">
            <Printer size={17} />
            <span>Browser print</span>
          </Button>
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

      <div
        className={cn(
          "grid gap-3",
          totals.creditedAmount &&
            totals.creditedAmount > 0 &&
            totals.debitedAmount &&
            totals.debitedAmount > 0
            ? "sm:grid-cols-5"
            : (totals.creditedAmount && totals.creditedAmount > 0) ||
                (totals.debitedAmount && totals.debitedAmount > 0)
              ? "sm:grid-cols-4"
              : "sm:grid-cols-3",
        )}
      >
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-sm text-text-secondary">Invoice total</p>
          <p className="mt-1 font-heading text-xl font-bold">{formatCurrency(totals.total)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-sm text-text-secondary">Paid</p>
          <p className="mt-1 font-heading text-xl font-bold">{formatCurrency(effectivePaid)}</p>
        </div>
        {totals.creditedAmount !== undefined && totals.creditedAmount > 0 && (
          <div className="rounded-xl border border-border bg-surface-card p-4">
            <p className="text-sm text-text-secondary">Credited</p>
            <p className="mt-1 font-heading text-xl font-bold">{formatCurrency(totals.creditedAmount)}</p>
          </div>
        )}
        {totals.debitedAmount !== undefined && totals.debitedAmount > 0 && (
          <div className="rounded-xl border border-border bg-surface-card p-4">
            <p className="text-sm text-text-secondary">Debited</p>
            <p className="mt-1 font-heading text-xl font-bold">{formatCurrency(totals.debitedAmount)}</p>
          </div>
        )}
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-sm text-text-secondary">Balance due</p>
          <p className="mt-1 font-heading text-xl font-bold">{formatCurrency(totals.balance)}</p>
        </div>
      </div>

      {relatedCreditNotes.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Related Credit Notes ({relatedCreditNotes.length})
          </h2>
          <div className="mt-3 divide-y divide-border/60">
            {relatedCreditNotes.map((cn) => (
              <div
                key={cn.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/credit-notes/${cn.id}`}
                    className="font-medium text-primary-light hover:underline"
                  >
                    {cn.creditNoteNumber}
                  </Link>
                  <span className="ml-2 text-xs text-text-muted">
                    Issued {formatInvoiceDate(cn.issueDate)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-text-primary">
                    {formatCurrency(cn.total)}
                  </span>
                  <span className="rounded-md border border-border/80 bg-surface-alt/60 px-2 py-0.5 text-xs text-text-secondary">
                    {cn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedDebitNotes.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Related Debit Notes ({relatedDebitNotes.length})
          </h2>
          <div className="mt-3 divide-y divide-border/60">
            {relatedDebitNotes.map((dn) => (
              <div
                key={dn.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/debit-notes/${dn.id}`}
                    className="font-medium text-primary-light hover:underline"
                  >
                    {dn.debitNoteNumber}
                  </Link>
                  <span className="ml-2 text-xs text-text-muted">
                    Issued {formatInvoiceDate(dn.issueDate)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-text-primary">
                    {formatCurrency(dn.total)}
                  </span>
                  <span className="rounded-md border border-border/80 bg-surface-alt/60 px-2 py-0.5 text-xs text-text-secondary">
                    {dn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedPayments.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Related Payments ({relatedPayments.length})
          </h2>
          <div className="mt-3 divide-y divide-border/60">
            {relatedPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/payments/${payment.id}`}
                    className="font-medium text-primary-light hover:underline"
                  >
                    {payment.customerName}
                  </Link>
                  <span className="ml-2 text-xs text-text-muted">
                    Paid {formatInvoiceDate(payment.paymentDate)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-text-primary">
                    {formatCurrency(payment.allocatedAmount)}
                  </span>
                  <span className="rounded-md border border-border/80 bg-surface-alt/60 px-2 py-0.5 text-xs text-text-secondary">
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <InvoiceDocument invoice={invoice} />
    </section>
  );
};
