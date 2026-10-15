"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  FileText,
  Mail,
  Phone,
  ShoppingCart,
  Trash2,
  User,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/shared/lib/money";
import { formatDate } from "@/shared/lib/date";
import { Button } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type {
  SalesOpportunity,
  OpportunityStage,
} from "../../domain/entities/sales-opportunity";
import {
  PIPELINE_STAGES,
  isOpportunityOverdue,
} from "../../domain/rules/sales-pipeline-rules";
import { OpportunityStageBadge, STAGE_CONFIG } from "../components/OpportunityStageBadge";
import { OpportunityModal } from "../components/OpportunityModal";
import { MarkLostModal } from "../components/MarkLostModal";
import { updateOpportunityAction } from "../../data/mutations/update-opportunity";
import { updateOpportunityStageAction } from "../../data/mutations/update-opportunity-stage";
import { deleteOpportunityAction } from "../../data/mutations/delete-opportunity";
import type { UpdateOpportunityRequestDTO } from "../../data/dto/sales-opportunity-dto";

export interface OpportunityDetailPageProps {
  initialOpportunity: SalesOpportunity;
  customers: Array<{ id: string; name: string; email?: string | null; phone?: string | null }>;
}

export const OpportunityDetailPage = ({
  initialOpportunity,
  customers,
}: OpportunityDetailPageProps) => {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [opportunity, setOpportunity] = useState<SalesOpportunity>(initialOpportunity);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const overdue = isOpportunityOverdue(opportunity.nextFollowUpDate, opportunity.stage);

  const handleEditSubmit = async (data: UpdateOpportunityRequestDTO) => {
    const res = await updateOpportunityAction(opportunity.id, data);
    if (res.success && res.data) {
      setOpportunity(res.data);
      startTransition(() => {
        router.refresh();
      });
      return { success: true };
    }
    return {
      success: false,
      error: res.error,
      fieldErrors: res.fieldErrors,
    };
  };

  const handleStageSelect = async (newStage: OpportunityStage) => {
    if (newStage === "LOST") {
      setIsLostModalOpen(true);
      return;
    }

    const res = await updateOpportunityStageAction(opportunity.id, {
      stage: newStage,
    });

    if (res.success && res.data) {
      setOpportunity(res.data);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleConfirmLost = async (oppId: string, lossReason: string) => {
    const res = await updateOpportunityStageAction(oppId, {
      stage: "LOST",
      lossReason,
    });

    if (res.success && res.data) {
      setOpportunity(res.data);
      startTransition(() => {
        router.refresh();
      });
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this opportunity?")) {
      return;
    }
    setIsDeleting(true);
    const res = await deleteOpportunityAction(opportunity.id);
    if (res.success) {
      router.push("/sales-pipeline");
    } else {
      setIsDeleting(false);
      alert(res.error || "Failed to delete opportunity.");
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/sales-pipeline"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft size={16} />
          Back to Sales Pipeline
        </Link>

        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setIsEditModalOpen(true)}
            className="h-9 px-3.5 text-xs font-medium"
          >
            <Edit size={14} />
            Edit Deal
          </Button>

          {/* Convert to Quotation */}
          <Link
            href={`/estimates/new?customerId=${opportunity.customerId || ""}`}
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="h-9 px-3.5 text-xs font-medium"
            >
              <FileText size={14} />
              Create Quotation
            </Button>
          </Link>

          {/* Convert to Sales Order */}
          <Link
            href={`/sales-orders/new?customerId=${opportunity.customerId || ""}`}
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="h-9 px-3.5 text-xs font-medium"
            >
              <ShoppingCart size={14} />
              Create Sales Order
            </Button>
          </Link>

          {/* Delete Button */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-9 px-3 text-xs font-medium text-danger hover:text-danger"
            title="Delete Opportunity"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {overdue && (
        <div className="flex items-center gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          <AlertTriangle size={18} className="shrink-0" />
          <p>
            <span className="font-semibold">Follow-up overdue!</span> Scheduled follow-up was due on{" "}
            <span className="font-bold underline">{opportunity.nextFollowUpDate ? formatDate(opportunity.nextFollowUpDate) : "an earlier date"}</span>. Please follow up with the customer promptly.
          </p>
        </div>
      )}

      {/* Main Header Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                {opportunity.title}
              </h1>
              <OpportunityStageBadge stage={opportunity.stage} />
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-text-muted">
              <span>Customer:</span>
              <span className="font-semibold text-text-primary">{opportunity.customerName}</span>
              {opportunity.source && <span>• Source: {opportunity.source}</span>}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-text-muted">Estimated Deal Value</p>
            <p className="text-3xl font-extrabold tracking-tight text-text-primary">
              {formatCurrency(opportunity.estimatedValue)}
            </p>
            <p className="text-xs text-text-muted">
              Probability: <span className="font-semibold text-text-primary">{opportunity.probability}%</span> (Weighted:{" "}
              <span className="font-semibold text-text-primary">
                {formatCurrency(opportunity.weightedValue)}
              </span>
              )
            </p>
          </div>
        </div>

        {/* Stage Progression Stepper */}
        <div className="mt-8 border-t border-border pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Pipeline Progression (Click to Change Stage)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE_STAGES.map((s, idx) => {
              const isCurrent = opportunity.stage === s;
              const stageConf = STAGE_CONFIG[s];

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStageSelect(s)}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 border text-center transition-all ${
                    isCurrent
                      ? `${stageConf.badgeClass} ring-2 ring-primary/40 font-bold`
                      : "border-border bg-surface-alt/40 text-text-muted hover:border-border-hover hover:text-text-primary"
                  }`}
                >
                  <span className="text-xs font-bold">{stageConf.label}</span>
                  <span className="mt-0.5 text-[10px] opacity-75">
                    {s === "WON" ? "100%" : s === "LOST" ? "0%" : `${idx * 25 + 10}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loss Reason Display if Lost */}
        {opportunity.stage === "LOST" && opportunity.lossReason && (
          <div className="mt-6 rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm">
            <p className="font-semibold text-danger">Recorded Reason for Loss:</p>
            <p className="mt-1 text-text-primary">{opportunity.lossReason}</p>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Deal Overview */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs">
          <h2 className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-text-primary">
            Deal Details
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Assigned Owner</p>
              <p className="font-medium text-text-primary">
                {opportunity.assignedTo || "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Expected Close Date</p>
              <p className="font-medium text-text-primary">
                {opportunity.expectedCloseDate
                  ? formatDate(opportunity.expectedCloseDate)
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Created On</p>
              <p className="font-medium text-text-primary">
                {formatDate(opportunity.createdAt)}
              </p>
            </div>
            {opportunity.description && (
              <div>
                <p className="text-xs text-text-muted">Description / Scope</p>
                <p className="mt-0.5 whitespace-pre-wrap text-text-secondary">
                  {opportunity.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs">
          <h2 className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-text-primary">
            Customer Information
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Company / Account Name</p>
              <p className="font-medium text-text-primary">{opportunity.customerName}</p>
            </div>
            {opportunity.contactPerson && (
              <div>
                <p className="text-xs text-text-muted">Key Contact</p>
                <p className="flex items-center gap-1.5 font-medium text-text-primary">
                  <User size={14} className="text-text-muted" />
                  {opportunity.contactPerson}
                </p>
              </div>
            )}
            {opportunity.customerEmail && (
              <div>
                <p className="text-xs text-text-muted">Email</p>
                <p className="flex items-center gap-1.5 font-medium text-text-primary">
                  <Mail size={14} className="text-text-muted" />
                  <a
                    href={`mailto:${opportunity.customerEmail}`}
                    className="hover:underline text-primary-light"
                  >
                    {opportunity.customerEmail}
                  </a>
                </p>
              </div>
            )}
            {opportunity.customerPhone && (
              <div>
                <p className="text-xs text-text-muted">Phone</p>
                <p className="flex items-center gap-1.5 font-medium text-text-primary">
                  <Phone size={14} className="text-text-muted" />
                  <a
                    href={`tel:${opportunity.customerPhone}`}
                    className="hover:underline text-text-primary"
                  >
                    {opportunity.customerPhone}
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Follow-up & Next Action */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs">
          <h2 className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-text-primary">
            Activity & Next Steps
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="text-xs text-text-muted">Next Follow-Up Date</p>
              <p
                className={cn(
                  "font-semibold",
                  overdue ? "text-danger flex items-center gap-1" : "text-text-primary",
                )}
              >
                {overdue && <AlertTriangle size={14} />}
                {opportunity.nextFollowUpDate
                  ? formatDate(opportunity.nextFollowUpDate)
                  : "None scheduled"}
              </p>
            </div>
            {opportunity.nextAction && (
              <div>
                <p className="text-xs text-text-muted">Next Action</p>
                <p className="font-medium text-text-primary">{opportunity.nextAction}</p>
              </div>
            )}
            {opportunity.notes && (
              <div>
                <p className="text-xs text-text-muted">Internal Notes</p>
                <p className="mt-0.5 whitespace-pre-wrap text-text-secondary">
                  {opportunity.notes}
                </p>
              </div>
            )}
            {opportunity.estimateNumber && (
              <div className="mt-2 rounded-lg bg-surface-alt/60 p-2.5 border border-border">
                <p className="text-xs text-text-muted">Linked Quotation</p>
                <p className="font-semibold text-primary-light">
                  {opportunity.estimateNumber}
                </p>
              </div>
            )}
            {opportunity.salesOrderNumber && (
              <div className="mt-2 rounded-lg bg-surface-alt/60 p-2.5 border border-border">
                <p className="text-xs text-text-muted">Linked Sales Order</p>
                <p className="font-semibold text-primary-light">
                  {opportunity.salesOrderNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Opportunity Modal */}
      <OpportunityModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        initialData={opportunity}
        customers={customers}
      />

      {/* Mark as Lost Modal */}
      <MarkLostModal
        isOpen={isLostModalOpen}
        opportunity={opportunity}
        onClose={() => setIsLostModalOpen(false)}
        onConfirm={handleConfirmLost}
      />
    </div>
  );
};
