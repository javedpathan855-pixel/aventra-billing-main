"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Edit,
  FileCheck2,
  Printer,
  RotateCcw,
  Send,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import type { Estimate, EstimateStatus } from "../../domain/entities/estimate";
import {
  canAcceptEstimate,
  canCancelEstimate,
  canConvertToInvoice,
  canDeleteEstimate,
  canEditEstimate,
  canRejectEstimate,
  canReopenEstimate,
  canSendEstimate,
} from "../../domain/rules/estimate-lifecycle-rules";
import {
  formatEstimateDate,
  resolveEstimateDisplayStatus,
} from "../../domain/rules/estimate-rules";
import { EstimateStatusBadge } from "../components/EstimateStatusBadge";
import { EstimateDocument } from "../components/EstimateDocument";
import {
  convertEstimateToInvoiceAction,
  deleteEstimateAction,
  transitionEstimateStatusAction,
} from "../../data/mutations/estimate-mutations";
import { convertEstimateToSalesOrderAction } from "@/features/sales-orders/data/mutations/sales-order-mutations";
import { Button } from "@/shared/components/form/Button";

export type EstimateDetailPageProps = {
  estimate: Estimate;
  organizationName?: string;
  convertedInvoiceNumber?: string;
  convertedSalesOrderNumber?: string;
};

export const EstimateDetailPage = ({
  estimate: initialEstimate,
  organizationName,
  convertedInvoiceNumber,
  convertedSalesOrderNumber,
}: EstimateDetailPageProps) => {
  const router = useRouter();
  const [estimate, setEstimate] = useState<Estimate>(initialEstimate);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const displayStatus = resolveEstimateDisplayStatus({
    status: estimate.status,
    validUntil: estimate.validUntil,
  });

  const handleStatusTransition = (targetStatus: EstimateStatus) => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await transitionEstimateStatusAction(
        estimate.id,
        targetStatus,
      );
      if (!result.success || !result.data) {
        setActionError(result.error || `Failed to transition to ${targetStatus}`);
        return;
      }
      setEstimate(result.data);
      setActionSuccess(`Estimate marked as ${targetStatus}.`);
    });
  };

  const handleConvertToInvoice = () => {
    if (
      !window.confirm(
        "Convert this estimate to a sales invoice? An invoice number will be allocated from Billing Settings.",
      )
    ) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await convertEstimateToInvoiceAction(estimate.id);
      if (!result.success || !result.data) {
        setActionError(result.error || "Failed to convert estimate to invoice.");
        return;
      }

      setEstimate(result.data.estimate);
      setActionSuccess(
        `Quotation successfully converted to Invoice ${result.data.invoiceNumber}!`,
      );
      router.push(`/invoices/${result.data.invoiceId}`);
    });
  };

  const handleConvertToSalesOrder = () => {
    if (
      !window.confirm(
        "Convert this quotation to a confirmed Sales Order? An order number will be allocated from Sales Settings.",
      )
    ) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const result = await convertEstimateToSalesOrderAction(estimate.id);
      if (!result.success || !result.data) {
        setActionError(result.error || "Failed to convert estimate to sales order.");
        return;
      }

      const newOrder = result.data;
      setEstimate((prev) => ({
        ...prev,
        convertedToSalesOrderId: newOrder.id,
      }));
      setActionSuccess(
        `Quotation successfully converted to Sales Order ${newOrder.orderNumber}!`,
      );
      router.push(`/sales-orders/${newOrder.id}`);
    });
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this draft estimate? This action cannot be undone.",
      )
    ) {
      return;
    }

    setActionError(null);

    startTransition(async () => {
      const result = await deleteEstimateAction(estimate.id);
      if (!result.success) {
        setActionError(result.error || "Failed to delete estimate.");
        return;
      }
      router.push("/estimates");
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/estimates"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-card text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
            aria-label="Back to estimates list"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono tracking-tight text-text-primary">
                {estimate.estimateNumber}
              </h1>
              <EstimateStatusBadge status={displayStatus} />
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">
              Created for <span className="font-medium text-text-primary">{estimate.customer}</span> on {formatEstimateDate(estimate.issueDate)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Print Document */}
          <Button
            type="button"
            variant="secondary"
            onClick={handlePrint}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5"
          >
            <Printer size={14} />
            <span>Print</span>
          </Button>

          {/* Edit Draft */}
          {canEditEstimate(estimate) && (
            <Link
              href={`/estimates/${estimate.id}/edit`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-alt transition-colors"
            >
              <Edit size={14} />
              <span>Edit Draft</span>
            </Link>
          )}

          {/* Mark as Sent */}
          {canSendEstimate(estimate) && (
            <Button
              type="button"
              variant="primary"
              onClick={() => handleStatusTransition("Sent")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Send size={14} />
              <span>Mark as Sent</span>
            </Button>
          )}

          {/* Accept / Convert to Invoice */}
          {canAcceptEstimate(estimate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatusTransition("Accepted")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-success hover:border-success/40"
            >
              <CheckCircle2 size={14} />
              <span>Mark Accepted</span>
            </Button>
          )}

          {canConvertToInvoice(estimate) && (
            <Button
              type="button"
              variant="primary"
              onClick={handleConvertToInvoice}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <FileCheck2 size={14} />
              <span>Convert to Invoice</span>
            </Button>
          )}

          {/* Convert to Sales Order */}
          {canConvertToInvoice(estimate) && !estimate.convertedToSalesOrderId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleConvertToSalesOrder}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <ShoppingCart size={14} />
              <span>Convert to Sales Order</span>
            </Button>
          )}

          {/* Reject */}
          {canRejectEstimate(estimate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatusTransition("Rejected")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40"
            >
              <XCircle size={14} />
              <span>Reject</span>
            </Button>
          )}

          {/* Cancel */}
          {canCancelEstimate(estimate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatusTransition("Cancelled")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Ban size={14} />
              <span>Cancel</span>
            </Button>
          )}

          {/* Reopen back to draft */}
          {canReopenEstimate(estimate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatusTransition("Draft")}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Reopen as Draft</span>
            </Button>
          )}

          {/* Delete Draft */}
          {canDeleteEstimate(estimate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDelete}
              disabled={isPending}
              className="h-9 px-3.5 text-xs font-semibold gap-1.5 text-danger hover:border-danger/40"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div
          className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div
          className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success"
          role="status"
        >
          {actionSuccess}
        </div>
      )}

      {/* Conversion Banner */}
      {estimate.convertedToInvoiceId && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <FileCheck2 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Converted to Sales Invoice
              </p>
              <p className="text-xs text-text-secondary">
                This estimate was converted into a genuine sales invoice.
                {estimate.convertedAt &&
                  ` Converted on ${formatEstimateDate(estimate.convertedAt)}.`}
              </p>
            </div>
          </div>

          <Link
            href={`/invoices/${estimate.convertedToInvoiceId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-light transition-colors self-start sm:self-auto"
          >
            <span>View Invoice {convertedInvoiceNumber || ""}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Sales Order Conversion Banner */}
      {estimate.convertedToSalesOrderId && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Converted to Sales Order
              </p>
              <p className="text-xs text-text-secondary">
                This quotation was converted into a confirmed sales order.
              </p>
            </div>
          </div>

          <Link
            href={`/sales-orders/${estimate.convertedToSalesOrderId}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-light transition-colors self-start sm:self-auto"
          >
            <span>View Sales Order {convertedSalesOrderNumber || ""}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Document View */}
      <EstimateDocument
        estimate={estimate}
        supplierName={organizationName}
      />
    </section>
  );
};
