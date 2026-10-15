"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  Printer,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Button, Checkbox, Input, Label, Select } from "@/shared/components/form";
import type {
  SalesReturn,
  ReturnDisposition,
} from "../../domain/entities/sales-return";
import { SalesReturnDocument } from "../components/SalesReturnDocument";
import { updateSalesReturnStatusAction } from "../../data/mutations/update-sales-return-status";
import { deleteSalesReturnAction } from "../../data/mutations/delete-sales-return";

export type SalesReturnDetailPageProps = {
  salesReturn: SalesReturn;
  organizationName?: string;
  organizationAddress?: string;
  organizationGstin?: string;
};

const dispositionOptions = [
  { value: "RESTOCK", label: "Restock (Sellable Inventory)" },
  { value: "DAMAGED", label: "Damaged (Non-Sellable / Scrap)" },
  { value: "QUARANTINE", label: "Quarantine (QC Hold)" },
];

export const SalesReturnDetailPage = ({
  salesReturn,
  organizationName,
  organizationAddress,
  organizationGstin,
}: SalesReturnDetailPageProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeModal, setActiveModal] = useState<"complete" | "cancel" | null>(null);

  // Inspection states for completion
  const [itemDispositions, setItemDispositions] = useState<Record<string, ReturnDisposition>>(() => {
    const initial: Record<string, ReturnDisposition> = {};
    for (const it of salesReturn.items) {
      initial[it.id] = it.disposition || "RESTOCK";
    }
    return initial;
  });

  const [itemReceivedQuantities, setItemReceivedQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const it of salesReturn.items) {
      initial[it.id] = it.receivedQuantity > 0 ? it.receivedQuantity : it.returnQuantity;
    }
    return initial;
  });

  const [createCreditNote, setCreateCreditNote] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSalesReturnStatusAction(salesReturn.id, {
        status: "APPROVED",
      });

      if (!result.success) {
        setError(result.error || "Failed to approve return.");
        return;
      }

      router.refresh();
    });
  };

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSalesReturnStatusAction(salesReturn.id, {
        status: "COMPLETED",
        receivedQuantities: itemReceivedQuantities,
        dispositions: itemDispositions,
        createCreditNote,
      });

      if (!result.success) {
        setError(result.error || "Failed to complete return processing.");
        return;
      }

      setActiveModal(null);
      router.refresh();
    });
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSalesReturnStatusAction(salesReturn.id, {
        status: "CANCELLED",
      });

      if (!result.success) {
        setError(result.error || "Failed to cancel return.");
        return;
      }

      setActiveModal(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this draft return?")) {
      setError(null);
      startTransition(async () => {
        const result = await deleteSalesReturnAction(salesReturn.id);
        if (!result.success) {
          setError(result.error || "Failed to delete return.");
          return;
        }
        router.push("/sales-returns");
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/sales-returns"
            className="rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
            title="Back to sales returns"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                {salesReturn.returnNumber}
              </h1>
              {salesReturn.invoiceNumber && (
                <span className="text-xs text-text-muted font-mono bg-surface-alt px-2 py-0.5 rounded">
                  INV: {salesReturn.invoiceNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Customer: <span className="font-medium text-text-primary">{salesReturn.customerName}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {salesReturn.status === "DRAFT" && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={handleApprove}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold"
              >
                <ShieldCheck size={14} />
                <span>Approve Return</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal("cancel")}
                disabled={isPending}
                className="h-9 px-3 text-xs font-medium text-danger hover:text-danger"
              >
                <XCircle size={14} />
                <span>Cancel</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                disabled={isPending}
                className="h-9 px-3 text-xs font-medium text-danger hover:text-danger"
                title="Delete draft return"
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}

          {salesReturn.status === "APPROVED" && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => setActiveModal("complete")}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold"
              >
                <CheckCircle size={14} />
                <span>Process Inspection &amp; Complete</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal("cancel")}
                disabled={isPending}
                className="h-9 px-3 text-xs font-medium text-danger hover:text-danger"
              >
                <XCircle size={14} />
                <span>Cancel Return</span>
              </Button>
            </>
          )}

          {salesReturn.status === "COMPLETED" && salesReturn.creditNoteId && (
            <Link href={`/credit-notes/${salesReturn.creditNoteId}`}>
              <Button
                type="button"
                variant="secondary"
                className="h-9 px-3 text-xs font-medium text-info"
              >
                <FileText size={14} />
                <span>View Credit Note</span>
              </Button>
            </Link>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={handlePrint}
            className="h-9 px-3.5 text-xs font-medium"
            title="Print or save as PDF"
          >
            <Printer size={14} />
            <span>Print Slip</span>
          </Button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div
          className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger flex items-center justify-between"
          role="alert"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => setError(null)}
            className="h-auto p-1 text-danger hover:text-danger/80"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* Main Document View */}
      <SalesReturnDocument
        salesReturn={salesReturn}
        organizationName={organizationName}
        organizationAddress={organizationAddress}
        organizationGstin={organizationGstin}
      />

      {/* Complete & Inspect Modal */}
      {activeModal === "complete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card border border-border rounded-xl p-6 w-full max-w-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary-light" />
                <h3 className="text-base font-semibold text-text-primary">
                  Physical Inspection &amp; Disposition
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setActiveModal(null)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </Button>
            </div>

            <p className="text-xs text-text-secondary">
              Verify the physically received quantities and classify each returned line item&apos;s disposition before finalizing the return and issuing credit.
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {salesReturn.items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-border/80 bg-surface-alt/30 p-3 space-y-2 text-xs"
                >
                  <div className="font-semibold text-text-primary">{it.item}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`rec_${it.id}`}>Received / Accepted Qty</Label>
                      <Input
                        id={`rec_${it.id}`}
                        type="number"
                        step="any"
                        min="0"
                        max={it.returnQuantity}
                        value={itemReceivedQuantities[it.id] ?? it.returnQuantity}
                        onChange={(e) =>
                          setItemReceivedQuantities((prev) => ({
                            ...prev,
                            [it.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`disp_${it.id}`}>Disposition</Label>
                      <Select
                        id={`disp_${it.id}`}
                        value={itemDispositions[it.id] || "RESTOCK"}
                        onChange={(val) =>
                          setItemDispositions((prev) => ({
                            ...prev,
                            [it.id]: val as ReturnDisposition,
                          }))
                        }
                        options={dispositionOptions}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Credit Note generation checkbox */}
            {salesReturn.invoiceId && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Checkbox
                  id="cnCheck"
                  checked={createCreditNote}
                  onChange={(e) => setCreateCreditNote(e.target.checked)}
                />
                <Label htmlFor="cnCheck" className="text-xs font-medium cursor-pointer">
                  Automatically generate and link a Credit Note against the original invoice
                </Label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal(null)}
                disabled={isPending}
                className="h-9 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleComplete}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : "Complete Return"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {activeModal === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-danger" />
                <h3 className="text-base font-semibold text-text-primary">
                  Cancel Sales Return
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setActiveModal(null)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </Button>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Are you sure you want to cancel this sales return? Cancelled returns do not reduce the original invoice&apos;s eligible returnable quantity.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal(null)}
                disabled={isPending}
                className="h-9 px-3 text-xs"
              >
                No, Keep Return
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCancel}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold bg-danger hover:bg-danger/90 text-white"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : "Yes, Cancel Return"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
