"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit,
  FileCheck2,
  Printer,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import type {
  PurchaseBill,
  PurchaseBillStatus,
} from "../../domain/entities/purchase-bill";
import type { SupplierPayment } from "@/features/supplier-payments";
import {
  canCancelPurchaseBill,
  canConfirmPurchaseBill,
  canDeletePurchaseBill,
  canEditPurchaseBill,
} from "../../domain/rules/purchase-bill-lifecycle-rules";
import { PurchaseBillStatusBadge } from "../components/PurchaseBillStatusBadge";
import { PurchaseBillDocument } from "../components/PurchaseBillDocument";
import { BillPaymentsCard } from "../components/BillPaymentsCard";
import {
  deletePurchaseBillAction,
  transitionPurchaseBillStatusAction,
} from "../../data/mutations/purchase-bill-mutations";
import { Button } from "@/shared/components/form";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

export type PurchaseBillDetailPageProps = {
  bill: PurchaseBill;
  organizationName?: string;
  payments?: SupplierPayment[];
  outstanding?: number;
};

export const PurchaseBillDetailPage = ({
  bill: initialBill,
  organizationName,
  payments = [],
  outstanding = 0,
}: PurchaseBillDetailPageProps) => {
  const router = useRouter();
  const [bill, setBill] = useState<PurchaseBill>(initialBill);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<
    | { kind: "status"; target: PurchaseBillStatus }
    | { kind: "delete" }
    | null
  >(null);

  const handleStatusTransition = (targetStatus: PurchaseBillStatus) => {
    setActionError(null);
    setActionSuccess(null);
    setConfirmState(null);

    startTransition(async () => {
      const result = await transitionPurchaseBillStatusAction(
        bill.id,
        targetStatus,
      );
      if (!result.success || !result.data) {
        setActionError(result.error || `Failed to transition to ${targetStatus}`);
        return;
      }
      setBill(result.data);
      setActionSuccess(`Purchase bill marked as ${targetStatus}.`);
    });
  };

  const handleDelete = () => {
    setActionError(null);
    setConfirmState(null);
    startTransition(async () => {
      const result = await deletePurchaseBillAction(bill.id);
      if (!result.success) {
        setActionError(result.error || "Failed to delete purchase bill.");
        return;
      }
      router.push("/purchase-bills");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/purchase-bills"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Purchase Bills
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">
              {bill.billNumber}
            </h1>
            <PurchaseBillStatusBadge status={bill.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Bill Date: {bill.billDate} • Due Date: {bill.dueDate}
            {bill.supplierInvoiceNumber &&
              ` • Supplier Invoice: ${bill.supplierInvoiceNumber}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canConfirmPurchaseBill(bill) && (
            <Button
              type="button"
              variant="primary"
              onClick={() => handleStatusTransition("Confirmed")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>Confirm Bill</span>
            </Button>
          )}

          {canEditPurchaseBill(bill) && (
            <Link
              href={`/purchase-bills/${bill.id}/edit`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors"
            >
              <Edit size={14} />
              <span>Edit Draft</span>
            </Link>
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

          {canCancelPurchaseBill(bill) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setConfirmState({ kind: "status", target: "Cancelled" })
              }
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40 hover:bg-danger/10"
            >
              <XCircle size={15} />
              <span>Cancel Bill</span>
            </Button>
          )}

          {canDeletePurchaseBill(bill) && (
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

      {bill.purchaseOrderId && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-primary-light" />
            <span className="text-xs sm:text-sm text-text-primary">
              Recorded against purchase order{" "}
              <strong className="font-mono">
                {bill.purchaseOrderNumber || bill.purchaseOrderId}
              </strong>
            </span>
          </div>
          <Link
            href={`/purchase-orders/${bill.purchaseOrderId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-light hover:underline"
          >
            View Source Order
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={confirmState?.kind === "status"}
        title="Cancel purchase bill?"
        description={`This marks purchase bill ${bill.billNumber} as Cancelled. The bill history is preserved; the bill becomes terminal and can no longer be edited.`}
        confirmLabel="Cancel Bill"
        variant="danger"
        isConfirming={isPending}
        onConfirm={() => handleStatusTransition("Cancelled")}
        onClose={() => setConfirmState(null)}
      />

      <ConfirmDialog
        open={confirmState?.kind === "delete"}
        title="Delete purchase bill?"
        description={`Permanently delete draft purchase bill ${bill.billNumber}? This action cannot be undone.`}
        confirmLabel="Delete Bill"
        variant="danger"
        isConfirming={isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmState(null)}
      />

      <BillPaymentsCard
        billId={bill.id}
        billNumber={bill.billNumber}
        billTotal={bill.total}
        supplierId={bill.supplierId}
        payments={payments}
        outstanding={outstanding}
      />

      <PurchaseBillDocument bill={bill} organizationName={organizationName} />
    </section>
  );
};
