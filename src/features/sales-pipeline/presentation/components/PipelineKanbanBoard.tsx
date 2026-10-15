import React from "react";
import Link from "next/link";
import { formatCurrency } from "@/shared/lib/money";
import { formatDate } from "@/shared/lib/date";
import type {
  SalesOpportunity,
  OpportunityStage,
} from "../../domain/entities/sales-opportunity";
import {
  PIPELINE_STAGES,
  isOpportunityOverdue,
} from "../../domain/rules/sales-pipeline-rules";
import { STAGE_CONFIG } from "./OpportunityStageBadge";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/form";
import {
  Clock,
  AlertTriangle,
  User,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react";

export interface PipelineKanbanBoardProps {
  opportunities: SalesOpportunity[];
  onQuickMoveStage?: (opp: SalesOpportunity, newStage: OpportunityStage) => void;
  onOpenLostModal?: (opp: SalesOpportunity) => void;
}

export const PipelineKanbanBoard = ({
  opportunities,
  onQuickMoveStage,
  onOpenLostModal,
}: PipelineKanbanBoardProps) => {
  // Group opportunities by stage
  const grouped = PIPELINE_STAGES.reduce<Record<OpportunityStage, SalesOpportunity[]>>(
    (acc, stage) => {
      acc[stage] = opportunities.filter((o) => o.stage === stage);
      return acc;
    },
    {
      NEW_LEAD: [],
      QUALIFIED: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      WON: [],
      LOST: [],
    },
  );

  const getNextStage = (stage: OpportunityStage): OpportunityStage | null => {
    switch (stage) {
      case "NEW_LEAD":
        return "QUALIFIED";
      case "QUALIFIED":
        return "PROPOSAL";
      case "PROPOSAL":
        return "NEGOTIATION";
      case "NEGOTIATION":
        return "WON";
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {PIPELINE_STAGES.map((stage) => {
        const stageOpps = grouped[stage] || [];
        const stageConfig = STAGE_CONFIG[stage];
        const totalValue = stageOpps.reduce(
          (sum, o) => sum + Number(o.estimatedValue || 0),
          0,
        );

        return (
          <div
            key={stage}
            className="flex min-w-65 flex-col rounded-xl border border-border bg-surface-alt/40 p-3"
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${stageConfig.dotClass}`}
                  aria-hidden="true"
                />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                  {stageConfig.label}
                </h3>
                <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-bold text-text-muted border border-border">
                  {stageOpps.length}
                </span>
              </div>
            </div>

            {/* Column Total Value */}
            <div className="mb-3 text-[11px] font-medium text-text-muted">
              Total:{" "}
              <span className="font-semibold text-text-primary">
                {formatCurrency(totalValue)}
              </span>
            </div>

            {/* Opportunity Cards */}
            <div className="flex flex-1 flex-col gap-2.5">
              {stageOpps.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-xs text-text-muted">
                  No opportunities
                </div>
              ) : (
                stageOpps.map((opp) => {
                  const overdue = isOpportunityOverdue(opp.nextFollowUpDate, opp.stage);
                  const nextStage = getNextStage(opp.stage);

                  return (
                    <div
                      key={opp.id}
                      className="group flex flex-col justify-between rounded-lg border border-border bg-surface p-3 shadow-2xs transition-all hover:border-border-hover hover:shadow-xs"
                    >
                      <div>
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            href={`/sales-pipeline/${opp.id}`}
                            className="text-sm font-semibold text-text-primary transition-colors hover:text-primary-light"
                          >
                            {opp.title}
                          </Link>
                          {overdue && (
                            <span
                              title="Follow-up overdue!"
                              className="flex items-center gap-0.5 rounded-sm bg-danger/10 px-1 py-0.5 text-[10px] font-bold text-danger"
                            >
                              <AlertTriangle size={10} />
                              Overdue
                            </span>
                          )}
                        </div>

                        {/* Customer / Company */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                          <User size={12} className="shrink-0" />
                          <span className="truncate">{opp.customerName}</span>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="mt-2.5 flex items-baseline justify-between border-t border-border/60 pt-2">
                          <div>
                            <p className="text-xs font-bold text-text-primary">
                              {formatCurrency(opp.estimatedValue)}
                            </p>
                            <p className="text-[10px] text-text-muted">
                              Wt: {formatCurrency(opp.weightedValue)} ({opp.probability}%)
                            </p>
                          </div>

                          {opp.nextFollowUpDate && (
                            <div className="text-right">
                              <p className="flex items-center justify-end gap-1 text-[10px] text-text-muted">
                                <Clock size={10} />
                                Follow-up:
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] font-medium",
                                  overdue ? "text-danger" : "text-text-secondary",
                                )}
                              >
                                {formatDate(opp.nextFollowUpDate)}
                              </p>
                            </div>
                          )}
                        </div>

                        {opp.stage === "LOST" && opp.lossReason && (
                          <div className="mt-2 rounded-md bg-danger/5 p-1.5 text-[11px] text-danger/80 border border-danger/10">
                            <span className="font-medium">Loss reason:</span> {opp.lossReason}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                        <Link
                          href={`/sales-pipeline/${opp.id}`}
                          className="text-[11px] font-medium text-primary-light hover:underline"
                        >
                          View Details
                        </Link>

                        <div className="flex items-center gap-1">
                          {nextStage && onQuickMoveStage && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => onQuickMoveStage(opp, nextStage)}
                              className="h-6 px-1.5 text-[10px] font-medium"
                              title={`Advance to ${STAGE_CONFIG[nextStage].label}`}
                            >
                              <ArrowRight size={10} />
                              {STAGE_CONFIG[nextStage].label}
                            </Button>
                          )}

                          {opp.stage !== "WON" &&
                            opp.stage !== "LOST" &&
                            onQuickMoveStage && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => onQuickMoveStage(opp, "WON")}
                                className="h-6 px-1.5 text-[10px] font-medium text-success hover:text-success"
                                title="Mark as Won"
                              >
                                <CheckCircle size={10} />
                              </Button>
                            )}

                          {opp.stage !== "WON" &&
                            opp.stage !== "LOST" &&
                            onOpenLostModal && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => onOpenLostModal(opp)}
                                className="h-6 px-1.5 text-[10px] font-medium text-danger hover:text-danger"
                                title="Mark as Lost"
                              >
                                <XCircle size={10} />
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
