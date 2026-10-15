"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Printer,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import type {
  PurchaseReturn,
  PurchaseReturnStatus,
} from "../../domain/entities/purchase-return";
import {
  canDeletePurchaseReturn,
  canTransitionPurchaseReturnStatus,
} from "../../domain/rules/purchase-return-rules";
import { PurchaseReturnStatusBadge } from "../components/PurchaseReturnStatusBadge";
import { PurchaseReturnDocument } from "../components/PurchaseReturnDocument";
import {
  deletePurchaseReturnAction,
  updatePurchaseReturnStatusAction,
} from "../../data/mutations/purchase-return-mutations";
import { Button } from "@/shared/components/form";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

export type PurchaseReturnDetailPageProps = {
  purchaseReturn: PurchaseReturn;
  organizationName?: string;
};

export const PurchaseReturnDetailPage = ({
  purchaseReturn: initialReturn,
  organizationName,
}: PurchaseReturnDetailPageProps) => {
  const router = useRouter();
  const [purchaseReturn, setPurchaseReturn] =
    useState<PurchaseReturn>(initialReturn);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<
    | { kind: "status"; target: PurchaseReturnStatus }
    | { kind: "delete" }
    | null
  >(null);

  const handleStatusTransition = (targetStatus: PurchaseReturnStatus) => {
    setActionError(null);
    setActionSuccess(null);
    setConfirmState(null);

    startTransition(async () => {
      const result = await updatePurchaseReturnStatusAction(purchaseReturn.id, {
        status: targetStatus,
      });
      if (!result.success || !result.data) {
        setActionError(result.error || `Failed to transition to ${targetStatus}`);
        return;
      }
      setPurchaseReturn(result.data);
      setActionSuccess(`Purchase return marked as ${targetStatus}.`);
    });
  };

  const handleDelete = () => {
    setActionError(null);
    setConfirmState(null);
    startTransition(async () => {
      const result = await deletePurchaseReturnAction(purchaseReturn.id);
      if (!result.success) {
        setActionError(result.error || "Failed to delete purchase return.");
        return;
      }
      router.push("/purchase-returns");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/purchase-returns"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Purchase Returns
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">
              {purchaseReturn.returnNumber}
            </h1>
            <PurchaseReturnStatusBadge status={purchaseReturn.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Return Date: {purchaseReturn.returnDate} • Reason:{" "}
            {purchaseReturn.reason}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canTransitionPurchaseReturnStatus(purchaseReturn.status, "APPROVED") && (
            <Button
              type="button"
              variant="primary"
              onClick={() => handleStatusTransition("APPROVED")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>Approve Return</span>
            </Button>
          )}

          {canTransitionPurchaseReturnStatus(purchaseReturn.status, "COMPLETED") && (
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                setConfirmState({ kind: "status", target: "COMPLETED" })
              }
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Undo2 size={15} />
              <span>Complete Return</span>
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

          {canTransitionPurchaseReturnStatus(purchaseReturn.status, "CANCELLED") && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setConfirmState({ kind: "status", target: "CANCELLED" })
              }
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40 hover:bg-danger/10"
            >
              <XCircle size={15} />
              <span>Cancel Return</span>
            </Button>
          )}

          {canDeletePurchaseReturn(purchaseReturn.status) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmState({ kind: "delete" })}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40 hover:bg-danger/10"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </Button>
          )}
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

      {purchaseReturn.purchaseBillId && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-primary-light" />
            <span className="text-xs sm:text-sm text-text-primary">
              Returned against purchase bill{" "}
              <strong className="font-mono">
                {purchaseReturn.purchaseBillNumber || purchaseReturn.purchaseBillId}
              </strong>
            </span>
          </div>
          <Link
            href={`/purchase-bills/${purchaseReturn.purchaseBillId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-light hover:underline"
          >
            View Source Bill
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirmState?.kind === "status" && confirmState.target === "COMPLETED"}
        title="Complete purchase return?"
        description={`This marks return ${purchaseReturn.returnNumber} as Completed: the goods are treated as dispatched back to the supplier. No inventory postings exist to reverse; the return becomes terminal.`}
        confirmLabel="Complete Return"
        variant="primary"
        isConfirming={isPending}
        onConfirm={() => handleStatusTransition("COMPLETED")}
        onClose={() => setConfirmState(null)}
      />

      <ConfirmDialog
        open={confirmState?.kind === "status" && confirmState.target === "CANCELLED"}
        title="Cancel purchase return?"
        description={`This marks return ${purchaseReturn.returnNumber} as Cancelled. The return history is preserved; the return becomes terminal.`}
        confirmLabel="Cancel Return"
        variant="danger"
        isConfirming={isPending}
        onConfirm={() => handleStatusTransition("CANCELLED")}
        onClose={() => setConfirmState(null)}
      />

      <ConfirmDialog
        open={confirmState?.kind === "delete"}
        title="Delete purchase return?"
        description={`Permanently delete draft purchase return ${purchaseReturn.returnNumber}? This action cannot be undone.`}
        confirmLabel="Delete Return"
        variant="danger"
        isConfirming={isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmState(null)}
      />

      <PurchaseReturnDocument
        purchaseReturn={purchaseReturn}
        organizationName={organizationName}
      />
    </section>
  );
};
