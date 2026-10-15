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
  PackageCheck,
  Printer,
  Receipt,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import type { SalesOrder, SalesOrderStatus } from "../../domain/entities/sales-order";
import {
  canCancelSalesOrder,
  canConfirmSalesOrder,
  canConvertToInvoice,
  canDeleteSalesOrder,
  canEditSalesOrder,
  canRecordFulfilment,
} from "../../domain/rules/sales-order-lifecycle-rules";
import { SalesOrderStatusBadge } from "../components/SalesOrderStatusBadge";
import { SalesOrderDocument } from "../components/SalesOrderDocument";
import {
  convertSalesOrderToInvoiceAction,
  deleteSalesOrderAction,
  recordFulfilmentAction,
  transitionSalesOrderStatusAction,
} from "../../data/mutations/sales-order-mutations";
import { Button, Input, Label } from "@/shared/components/form";

export type SalesOrderDetailPageProps = {
  order: SalesOrder;
  organizationName?: string;
};

export const SalesOrderDetailPage = ({
  order: initialOrder,
  organizationName,
}: SalesOrderDetailPageProps) => {
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrder>(initialOrder);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fulfilment recording dialog state
  const [showFulfilmentModal, setShowFulfilmentModal] = useState(false);
  const [fulfilmentInputs, setFulfilmentInputs] = useState<Record<string, number>>(
    () => {
      const map: Record<string, number> = {};
      for (const line of initialOrder.items) {
        map[line.id] = line.fulfilledQuantity;
      }
      return map;
    },
  );

  const handleStatusTransition = (targetStatus: SalesOrderStatus) => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await transitionSalesOrderStatusAction(
        order.id,
        targetStatus,
      );
      if (!result.success || !result.data) {
        setActionError(result.error || `Failed to transition to ${targetStatus}`);
        return;
      }
      setOrder(result.data);
      setActionSuccess(`Sales order marked as ${targetStatus}.`);
    });
  };

  const handleConvertToInvoice = () => {
    if (
      !window.confirm(
        "Convert this Sales Order into a genuine Invoice? An invoice number will be allocated automatically from Billing Settings.",
      )
    ) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await convertSalesOrderToInvoiceAction(order.id);
      const invoiceId = result.success ? result.data?.invoiceId : undefined;
      if (!result.success || !invoiceId) {
        setActionError(
          result.error || "Failed to convert sales order to invoice.",
        );
        return;
      }
      setActionSuccess(
        `Invoice ${result.data?.invoiceNumber} created successfully! Redirecting...`,
      );
      setTimeout(() => {
        router.push(`/invoices/${invoiceId}`);
      }, 1000);
    });
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Sales Order ${order.orderNumber}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const result = await deleteSalesOrderAction(order.id);
      if (!result.success) {
        setActionError(result.error || "Failed to delete sales order.");
        return;
      }
      router.push("/sales-orders");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveFulfilment = () => {
    setActionError(null);
    setActionSuccess(null);

    const itemsToUpdate = Object.entries(fulfilmentInputs).map(([id, qty]) => ({
      id,
      fulfilledQuantity: qty,
    }));

    startTransition(async () => {
      const result = await recordFulfilmentAction(order.id, {
        items: itemsToUpdate,
      });

      if (!result.success || !result.data) {
        setActionError(result.error || "Failed to record fulfilment.");
        return;
      }

      setOrder(result.data);
      setShowFulfilmentModal(false);
      setActionSuccess("Fulfilment quantities updated successfully.");
    });
  };

  return (
    <section className="space-y-6">
      {/* 1. Back Navigation Link */}
      <div className="print:hidden">
        <Link
          href="/sales-orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Sales Orders
        </Link>
      </div>

      {/* 2. Top Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">
              {order.orderNumber}
            </h1>
            <SalesOrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Order Date: {order.orderDate}
            {order.expectedDeliveryDate && ` • Expected Delivery: ${order.expectedDeliveryDate}`}
            {order.referenceNumber && ` • PO: ${order.referenceNumber}`}
          </p>
        </div>

        {/* Permitted Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {canConfirmSalesOrder(order) && (
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

          {canRecordFulfilment(order) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowFulfilmentModal(true)}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Truck size={15} />
              <span>Record Fulfilment</span>
            </Button>
          )}

          {canConvertToInvoice(order) && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleConvertToInvoice}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Receipt size={15} />
              <span>Convert to Invoice</span>
            </Button>
          )}

          {canEditSalesOrder(order) && (
            <Link
              href={`/sales-orders/${order.id}/edit`}
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

          {canCancelSalesOrder(order) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to cancel this order? This action marks the order Cancelled.",
                  )
                ) {
                  handleStatusTransition("Cancelled");
                }
              }}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40 hover:bg-danger/10"
            >
              <XCircle size={15} />
              <span>Cancel Order</span>
            </Button>
          )}

          {canDeleteSalesOrder(order) && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDelete}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40 hover:bg-danger/10"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Feedback Messages */}
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

      {/* 4. Converted from Quotation Banner */}
      {order.sourceEstimateId && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-primary-light" />
            <span className="text-xs sm:text-sm text-text-primary">
              Converted from accepted quotation{" "}
              <strong className="font-mono">
                {order.sourceEstimateNumber || order.sourceEstimateId}
              </strong>
            </span>
          </div>
          <Link
            href={`/estimates/${order.sourceEstimateId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-light hover:underline"
          >
            View Source Quotation
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* 5. Invoices Generated Banner */}
      {order.invoices && order.invoices.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <Receipt size={16} className="text-primary-light" />
            <span>Invoices Generated from this Order ({order.invoices.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {order.invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="rounded-lg border border-border/80 bg-surface-alt/40 p-3 hover:border-primary/50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="font-mono text-xs font-semibold text-text-primary group-hover:text-primary-light">
                    {inv.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Issued: {inv.issueDate} • Status: {inv.status}
                  </div>
                </div>
                <ArrowRight size={14} className="text-text-muted group-hover:text-primary-light" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 6. Fulfilment Progress Card */}
      <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary-light" />
            <h2 className="text-base font-semibold text-text-primary">
              Delivery &amp; Fulfilment Status
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
                    Math.round((line.fulfilledQuantity / line.quantity) * 100),
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
                      Fulfilled
                    </span>
                    <span className="font-mono font-medium text-success">
                      {line.fulfilledQuantity}
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

      {/* 7. Fulfilment Recording Modal */}
      {showFulfilmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-primary-light" />
                <h3 className="text-base font-semibold text-text-primary">
                  Record Goods Delivery
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setShowFulfilmentModal(false)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
                aria-label="Close dialog"
              >
                <X size={18} />
              </Button>
            </div>

            <p className="text-xs text-text-secondary">
              Update delivered quantities for this order. Quantities cannot exceed the originally ordered amount.
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
                    <Label htmlFor={`fulfil-${it.id}`} className="sr-only">
                      Fulfilled Quantity
                    </Label>
                    <Input
                      id={`fulfil-${it.id}`}
                      type="number"
                      min="0"
                      max={it.quantity}
                      step="any"
                      value={
                        fulfilmentInputs[it.id] !== undefined
                          ? fulfilmentInputs[it.id]
                          : it.fulfilledQuantity
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setFulfilmentInputs((prev) => ({
                          ...prev,
                          [it.id]: isNaN(val) ? 0 : Math.min(it.quantity, Math.max(0, val)),
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
                onClick={() => setShowFulfilmentModal(false)}
                className="h-9 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveFulfilment}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold gap-1.5"
              >
                <PackageCheck size={14} />
                <span>Save Fulfilment</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Render Document Layout for View and Printing */}
      <SalesOrderDocument order={order} supplierName={organizationName} />
    </section>
  );
};
