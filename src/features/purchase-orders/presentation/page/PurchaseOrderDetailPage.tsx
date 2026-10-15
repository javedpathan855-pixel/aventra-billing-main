"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  PackageCheck,
  Printer,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "../../domain/entities/purchase-order";
import {
  canCancelPurchaseOrder,
  canConfirmPurchaseOrder,
  canDeletePurchaseOrder,
  canEditPurchaseOrder,
  canRecordReceiving,
} from "../../domain/rules/purchase-order-lifecycle-rules";
import { PurchaseOrderStatusBadge } from "../components/PurchaseOrderStatusBadge";
import { PurchaseOrderDocument } from "../components/PurchaseOrderDocument";
import {
  deletePurchaseOrderAction,
  recordReceivingAction,
  transitionPurchaseOrderStatusAction,
} from "../../data/mutations/purchase-order-mutations";
import { Button, Input, Label } from "@/shared/components/form";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

export type PurchaseOrderDetailPageProps = {
  order: PurchaseOrder;
  organizationName?: string;
};

export const PurchaseOrderDetailPage = ({
  order: initialOrder,
  organizationName,
}: PurchaseOrderDetailPageProps) => {
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrder>(initialOrder);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [receivingInputs, setReceivingInputs] = useState<Record<string, number>>(
    () => {
      const map: Record<string, number> = {};
      for (const line of initialOrder.items) {
        map[line.id] = line.receivedQuantity;
      }
      return map;
    },
  );

  const [confirmState, setConfirmState] = useState<
    | { kind: "status"; target: PurchaseOrderStatus }
    | { kind: "delete" }
    | null
  >(null);

  const handleStatusTransition = (targetStatus: PurchaseOrderStatus) => {
    setActionError(null);
    setActionSuccess(null);
    setConfirmState(null);

    startTransition(async () => {
      const result = await transitionPurchaseOrderStatusAction(
        order.id,
        targetStatus,
      );
      if (!result.success || !result.data) {
        setActionError(result.error || `Failed to transition to ${targetStatus}`);
        return;
      }
      setOrder(result.data);
      setActionSuccess(`Purchase order marked as ${targetStatus}.`);
    });
  };

  const handleDelete = () => {
    setActionError(null);
    setConfirmState(null);
    startTransition(async () => {
      const result = await deletePurchaseOrderAction(order.id);
      if (!result.success) {
        setActionError(result.error || "Failed to delete purchase order.");
        return;
      }
      router.push("/purchase-orders");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveReceiving = () => {
    setActionError(null);
    setActionSuccess(null);

    const itemsToUpdate = Object.entries(receivingInputs).map(([id, qty]) => ({
      id,
      receivedQuantity: qty,
    }));

    startTransition(async () => {
      const result = await recordReceivingAction(order.id, {
        items: itemsToUpdate,
      });

      if (!result.success || !result.data) {
        setActionError(result.error || "Failed to record receiving.");
        return;
      }

      setOrder(result.data);
      setShowReceivingModal(false);
      setActionSuccess("Received quantities updated successfully.");
    });
  };

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <Link
          href="/purchase-orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Purchase Orders
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">
              {order.orderNumber}
            </h1>
            <PurchaseOrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Order Date: {order.orderDate}
            {order.expectedDeliveryDate &&
              ` • Expected Delivery: ${order.expectedDeliveryDate}`}
            {order.referenceNumber && ` • Ref: ${order.referenceNumber}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canConfirmPurchaseOrder(order) && (
            <Button
              type="button"
              variant="primary"
              onClick={() => handleStatusTransition("Confirmed")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>Confirm Order</span>
            </Button>
          )}

          {canRecordReceiving(order) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowReceivingModal(true)}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Truck size={15} />
              <span>Record Receiving</span>
            </Button>
          )}

          {canEditPurchaseOrder(order) && (
            <Link
              href={`/purchase-orders/${order.id}/edit`}
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

          {canCancelPurchaseOrder(order) && (
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
              <span>Cancel Order</span>
            </Button>
          )}

          {canDeletePurchaseOrder(order) && (
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

      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary-light" />
            <h2 className="text-base font-semibold text-text-primary">
              Delivery &amp; Receiving Status
            </h2>
          </div>
          <span className="text-xs text-text-secondary">
            Expected Delivery: {order.expectedDeliveryDate || "Not specified"}
          </span>
        </div>

        <div className="space-y-3">
          {order.items.map((line) => {
            const pct =
              line.quantity > 0
                ? Math.min(
                    100,
                    Math.round((line.receivedQuantity / line.quantity) * 100),
                  )
                : 0;

            return (
              <div
                key={line.id}
                className="rounded-lg border border-border/60 bg-surface-alt/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-text-primary block">
                    {line.item}
                  </span>
                  {line.description && (
                    <span className="text-text-muted truncate block">
                      {line.description}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-text-muted text-[10px] uppercase block">
                      Ordered
                    </span>
                    <span className="font-mono font-medium text-text-primary">
                      {line.quantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px] uppercase block">
                      Received
                    </span>
                    <span className="font-mono font-medium text-success">
                      {line.receivedQuantity}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px] uppercase block">
                      Remaining
                    </span>
                    <span className="font-mono font-medium text-text-secondary">
                      {line.remainingQuantity}
                    </span>
                  </div>

                  <div className="w-24">
                    <div className="w-full bg-surface-alt rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted font-mono block text-right mt-0.5">
                      {pct}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showReceivingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-surface-card p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Record goods receipt"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-primary-light" />
                <h3 className="text-base font-semibold text-text-primary">
                  Record Goods Receipt
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setShowReceivingModal(false)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
                aria-label="Close dialog"
              >
                <X size={18} />
              </Button>
            </div>

            <p className="text-xs text-text-secondary">
              Update received quantities for this order. Quantities cannot exceed
              the originally ordered amount.
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {order.items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-border/80 bg-surface-alt/40 p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-text-primary block">
                      {it.item}
                    </span>
                    <span className="text-text-muted text-[11px]">
                      Ordered: {it.quantity} • Remaining: {it.remainingQuantity}
                    </span>
                  </div>

                  <div className="w-28">
                    <Label htmlFor={`receive-${it.id}`} className="sr-only">
                      Received Quantity
                    </Label>
                    <Input
                      id={`receive-${it.id}`}
                      type="number"
                      min="0"
                      max={it.quantity}
                      step="any"
                      value={
                        receivingInputs[it.id] !== undefined
                          ? receivingInputs[it.id]
                          : it.receivedQuantity
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setReceivingInputs((prev) => ({
                          ...prev,
                          [it.id]: isNaN(val)
                            ? 0
                            : Math.min(it.quantity, Math.max(0, val)),
                        }));
                      }}
                      className="h-8 font-mono text-xs text-right"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowReceivingModal(false)}
                className="h-9 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveReceiving}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold gap-1.5"
              >
                <PackageCheck size={14} />
                <span>Save Receiving</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmState?.kind === "status"}
        title="Cancel purchase order?"
        description={`This marks purchase order ${order.orderNumber} as Cancelled. Received goods history is preserved; the order becomes terminal and can no longer be edited.`}
        confirmLabel="Cancel Order"
        variant="danger"
        isConfirming={isPending}
        onConfirm={() => handleStatusTransition("Cancelled")}
        onClose={() => setConfirmState(null)}
      />

      <ConfirmDialog
        open={confirmState?.kind === "delete"}
        title="Delete purchase order?"
        description={`Permanently delete draft purchase order ${order.orderNumber}? This action cannot be undone.`}
        confirmLabel="Delete Order"
        variant="danger"
        isConfirming={isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmState(null)}
      />

      <PurchaseOrderDocument order={order} organizationName={organizationName} />
    </section>
  );
};
