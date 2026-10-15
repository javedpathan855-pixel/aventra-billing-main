"use client";

import Link from "next/link";
import { ArrowLeft, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/form/Button";
import {
  allocatedTotal,
  formatCurrency,
  formatPaymentDate,
  type Payment,
} from "../../domain/payment";
import { PaymentStatusBadge } from "../components/PaymentStatusBadge";
import { reversePaymentAction } from "../../data/mutations/payment-mutations";
import { Input, Label } from "@/shared/components/form";

export type PaymentDetailPageProps = {
  initialPayment?: Payment | null;
};

export const PaymentDetailPage = ({
  initialPayment,
}: PaymentDetailPageProps) => {
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null | undefined>(initialPayment);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  if (!payment) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Payment not found
        </h1>
        <p className="mx-auto mt-2 max-w-md text-text-secondary">
          The requested payment does not exist or does not belong to your organization.
        </p>
        <Link
          href="/payments"
          className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
        >
          <ArrowLeft size={17} />
          <span>Return to payments</span>
        </Link>
      </div>
    );
  }

  const handleReverse = async () => {
    if (
      !confirm(
        "Reverse this payment? Its allocations stop counting toward invoice balances. The original record is preserved for audit.",
      )
    ) {
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    const result = await reversePaymentAction({
      id: payment.id,
      reason: reversalReason.trim() || undefined,
    });
    if (!result.success) {
      setActionError(result.error || "Failed to reverse payment.");
      setIsProcessing(false);
      return;
    }
    setPayment(result.data);
    setIsProcessing(false);
    router.refresh();
  };

  const allocated = payment.status === "Active" ? allocatedTotal(payment.allocations) : 0;

  return (
    <section className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            <span>Back to payments</span>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold text-text-primary">
              {formatCurrency(payment.amount)}
            </h1>
            <PaymentStatusBadge status={payment.status} />
          </div>
          <p className="mt-2 text-text-secondary">
            {payment.customerName} · Received {formatPaymentDate(payment.paymentDate)} ·{" "}
            {payment.method}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {payment.status === "Active" && (
            <Button
              variant="secondary"
              disabled={isProcessing}
              onClick={handleReverse}
              className="px-3.5 text-danger hover:text-danger-light"
            >
              <RotateCcw size={15} />
              <span>{isProcessing ? "Reversing..." : "Reverse Payment"}</span>
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()} className="px-4">
            <Printer size={15} />
            <span>Print</span>
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

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Amount Received</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatCurrency(payment.amount)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Allocated</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatCurrency(allocated)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Reference</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {payment.reference || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Payment Date</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">
            {formatPaymentDate(payment.paymentDate)}
          </p>
        </div>
      </div>

      {payment.status === "Reversed" && (
        <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Reversal Record
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Reversed{payment.reversedAt ? ` on ${formatPaymentDate(payment.reversedAt.split("T")[0] ?? "")}` : ""}
            {payment.reversalReason ? ` — ${payment.reversalReason}` : " — no reason recorded"}.
            The original payment and its allocations are preserved above for audit.
          </p>
        </div>
      )}

      {payment.status === "Active" && (
        <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
          <Label htmlFor="reversal-reason">Reversal Reason (optional)</Label>
          <Input
            id="reversal-reason"
            type="text"
            value={reversalReason}
            onChange={(e) => setReversalReason(e.target.value)}
            placeholder="e.g. Cheque bounced, duplicate entry..."
            className="mt-1 h-10 text-sm"
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Allocations ({payment.allocations.length})
        </h2>
        <div className="mt-3 divide-y divide-border/60">
          {payment.allocations.map((line) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
            >
              <div>
                <Link
                  href={`/invoices/${line.invoiceId}`}
                  className="font-medium text-primary-light hover:underline"
                >
                  {line.invoiceNumber || "View Invoice"}
                </Link>
              </div>
              <span className="font-semibold tabular-nums text-text-primary">
                {formatCurrency(line.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {payment.notes && (
        <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5 text-sm">
          <h2 className="font-heading text-base font-semibold text-text-primary">Notes</h2>
          <p className="mt-1 text-text-secondary">{payment.notes}</p>
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-text-muted">
        <Trash2 size={13} aria-hidden="true" />
        Payments are never deleted. Reversal preserves the full record and its history.
      </p>
    </section>
  );
};
