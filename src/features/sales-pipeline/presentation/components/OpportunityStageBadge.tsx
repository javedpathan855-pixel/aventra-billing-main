import React from "react";
import type { OpportunityStage } from "../../domain/entities/sales-opportunity";
import { cn } from "@/shared/utils/cn";

export const STAGE_CONFIG: Record<
  OpportunityStage,
  { label: string; badgeClass: string; dotClass: string }
> = {
  NEW_LEAD: {
    label: "New Lead",
    badgeClass: "bg-info/10 text-info border border-info/20",
    dotClass: "bg-info",
  },
  QUALIFIED: {
    label: "Qualified",
    badgeClass: "bg-info/10 text-info border border-info/20",
    dotClass: "bg-info",
  },
  PROPOSAL: {
    label: "Proposal",
    badgeClass: "bg-warning/10 text-warning border border-warning/20",
    dotClass: "bg-warning",
  },
  NEGOTIATION: {
    label: "Negotiation",
    badgeClass: "bg-warning/10 text-warning border border-warning/20",
    dotClass: "bg-warning",
  },
  WON: {
    label: "Won",
    badgeClass: "bg-success/10 text-success border border-success/20",
    dotClass: "bg-success",
  },
  LOST: {
    label: "Lost",
    badgeClass: "bg-danger/10 text-danger border border-danger/20",
    dotClass: "bg-danger",
  },
};

export interface OpportunityStageBadgeProps {
  stage: OpportunityStage;
  className?: string;
  showDot?: boolean;
}

export const OpportunityStageBadge = ({
  stage,
  className,
  showDot = true,
}: OpportunityStageBadgeProps) => {
  const config = STAGE_CONFIG[stage] || {
    label: stage,
    badgeClass: "bg-surface-alt text-text-muted border border-border",
    dotClass: "bg-text-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        config.badgeClass,
        className,
      )}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)}
          aria-hidden="true"
        />
      )}
      {config.label}
    </span>
  );
};
