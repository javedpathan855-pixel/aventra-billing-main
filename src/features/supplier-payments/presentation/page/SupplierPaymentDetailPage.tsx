"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Printer,
  Undo2,
  X,
} from "lucide-react";
import { formatCurrency } from "../../domain/supplier-payment";
import type { SupplierPayment } from "../../domain/supplier-payment";
import { canReverseSupplierPayment } from "../../domain/supplier-payment";
import { SupplierPaymentStatusBadge } from "../components/SupplierPaymentStatusBadge";
import { SupplierPaymentDocument } from "../components/SupplierPaymentDocument";
import { reverseSupplierPaymentAction } from "../../data/mutations/supplier-payment-mutations";
import { Button, Input, Label } from "@/shared/components/form";

export type SupplierPaymentDetailPageProps = {
  payment: SupplierPayment;
  organizationName?: string;
};

export const SupplierPaymentDetailPage = ({
  payment: initialPayment,
  organizationName,
}: SupplierPaymentDetailPageProps) => {
  const router = useRouter();
  const [payment, setPayment] = useState<SupplierPayment>(initialPayment);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reversalReason, setReversalReason] = useState("");

  const handleReverse = () => {
    setActionError(null);
    setActionSuccess(null);
    setShowReverseDialog(false);

    startTransition(async () => {
      const result = await reverseSupplierPaymentAction({
        id: payment.id,
        reason: reversalReason || undefined,
      });
      if (!result.success || !result.data) {
        setActionError(result.error || "Failed to reverse supplier payment.");
        return;
      }
      setPayment(result.data);
      setReversalReason("");
      setActionSuccess("Supplier payment reversed. Bill balances restored.");
      router.refresh();
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/supplier-payments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Supplier Payments
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">
              {formatCurrency(payment.amount)}
            </h1>
            <SupplierPaymentStatusBadge status={payment.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Paid to {payment.supplierName} on {payment.paymentDate} via{" "}
            {payment.method}
            {payment.reference && ` • Ref: ${payment.reference}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canReverseSupplierPayment(payment.status) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowReverseDialog(true)}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40 hover:bg-danger/10"
            >
              <Undo2 size={15} />
              <span>Reverse Payment</span>
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={handlePrint}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5"
          >
            <Printer size={15} />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div
          className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success flex items-center justify-between print:hidden"
          role="status"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionSuccess}</span>
          </div>
          <Button
            type="button"
            variant="link"
            onClick={() => setActionSuccess(null)}
            className="h-auto p-1 text-success hover:text-success/80"
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {actionError && (
        <div
          className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger flex items-center justify-between print:hidden"
          role="alert"
        >
          <span>{actionError}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => setActionError(null)}
            className="h-auto p-1 text-danger hover:text-danger/80"
            aria-label="Dismiss error message"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-3 print:hidden">
        <h2 className="text-base font-semibold text-text-primary">
          Bill Allocations
        </h2>
        <div className="space-y-2">
          {payment.allocations.map((line) => (
            <Link
              key={line.id}
              href={`/purchase-bills/${line.purchaseBillId}`}
              className="rounded-lg border border-border/60 bg-surface-alt/30 p-3 flex items-center justify-between gap-3 text-xs hover:border-primary/50 transition-colors"
            >
              <span className="font-mono font-semibold text-text-primary">
                {line.billNumber || line.purchaseBillId}
              </span>
              <span className="font-mono font-medium text-text-primary">
                {formatCurrency(line.amount)}
              </span>
              <ArrowRight size={14} className="text-text-muted shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {showReverseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-surface-card p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Reverse supplier payment"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Undo2 size={18} className="text-danger" />
                <h3 className="text-base font-semibold text-text-primary">
                  Reverse Supplier Payment
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setShowReverseDialog(false)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
                aria-label="Close dialog"
              >
                <X size={18} />
              </Button>
            </div>

            <p className="text-xs text-text-secondary">
              Reversing restores the outstanding balances of the allocated
              bills. This cannot be undone; a corrected payment must be
              recorded separately.
            </p>

            <div>
              <Label htmlFor="sp-reverse-reason">
                Reversal Reason (Optional)
              </Label>
              <Input
                id="sp-reverse-reason"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Duplicate entry, wrong supplier"
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowReverseDialog(false)}
                className="h-9 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleReverse}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold gap-1.5"
              >
                <Undo2 size={14} />
                <span>Reverse Payment</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <SupplierPaymentDocument
        payment={payment}
        organizationName={organizationName}
      />
    </section>
  );
};
