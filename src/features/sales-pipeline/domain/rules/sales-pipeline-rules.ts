import type {
  OpportunityStage,
  SalesOpportunity,
  OpportunityMetrics,
} from "../entities/sales-opportunity";
import {
  InvalidOpportunityStageTransitionError,
  MandatoryLossReasonError,
  SalesPipelineDomainError,
} from "../errors/sales-pipeline-errors";

export const STAGE_DEFAULT_PROBABILITIES: Record<OpportunityStage, number> = {
  NEW_LEAD: 10,
  QUALIFIED: 30,
  PROPOSAL: 60,
  NEGOTIATION: 80,
  WON: 100,
  LOST: 0,
};

export const PIPELINE_STAGES: OpportunityStage[] = [
  "NEW_LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

/**
 * Explicit allowed stage transitions, enforced server-side on every stage
 * change (dedicated stage action, generic update, and repository boundary).
 *
 * Open stages are fully connected: deals may move forward, step back to an
 * earlier open stage when stalled, skip ahead when fast-tracked, or close to
 * WON / LOST (LOST additionally requires a loss reason). Terminal stages
 * WON and LOST accept no outgoing transitions: reopening a closed deal is a
 * new opportunity, which preserves close history and keeps win-rate metrics
 * from being rewritten by stage flips such as LOST -> WON.
 */
export const ALLOWED_STAGE_TRANSITIONS: Record<
  OpportunityStage,
  readonly OpportunityStage[]
> = {
  NEW_LEAD: ["QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
  QUALIFIED: ["NEW_LEAD", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
  PROPOSAL: ["NEW_LEAD", "QUALIFIED", "NEGOTIATION", "WON", "LOST"],
  NEGOTIATION: ["NEW_LEAD", "QUALIFIED", "PROPOSAL", "WON", "LOST"],
  WON: [],
  LOST: [],
};

export const canTransitionOpportunityStage = (
  from: OpportunityStage,
  to: OpportunityStage,
): boolean => {
  if (from === to) return true;
  return (ALLOWED_STAGE_TRANSITIONS[from] ?? []).includes(to);
};

export const validateOpportunityStageTransition = (
  from: OpportunityStage,
  to: OpportunityStage,
): void => {
  if (!canTransitionOpportunityStage(from, to)) {
    throw new InvalidOpportunityStageTransitionError(from, to);
  }
};

export const calculateWeightedOpportunityValue = (
  estimatedValue: number,
  probability: number,
): number => {
  if (estimatedValue < 0) return 0;
  const clampedProb = Math.max(0, Math.min(100, probability));
  return Number(((estimatedValue * clampedProb) / 100).toFixed(2));
};

export const validateProbability = (probability: number): void => {
  if (typeof probability !== "number" || isNaN(probability)) {
    throw new SalesPipelineDomainError("Probability must be a valid number between 0 and 100.");
  }
  if (probability < 0 || probability > 100) {
    throw new SalesPipelineDomainError("Probability must be between 0 and 100.");
  }
};

export const assertLossReasonWhenLost = (
  stage: OpportunityStage,
  lossReason?: string | null,
): void => {
  if (stage === "LOST") {
    if (!lossReason || lossReason.trim().length === 0) {
      throw new MandatoryLossReasonError();
    }
  }
};

export const isOpportunityOverdue = (
  nextFollowUpDate: Date | null | undefined,
  stage: OpportunityStage,
  referenceDate: Date = new Date(),
): boolean => {
  if (!nextFollowUpDate) return false;
  if (stage === "WON" || stage === "LOST") return false;

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const target = new Date(nextFollowUpDate);
  target.setHours(0, 0, 0, 0);

  return target.getTime() < ref.getTime();
};

export const calculatePipelineMetrics = (
  opportunities: SalesOpportunity[],
  referenceDate: Date = new Date(),
): OpportunityMetrics => {
  let totalPipelineValue = 0;
  let weightedPipelineValue = 0;
  let openCount = 0;
  let wonCount = 0;
  let lostCount = 0;
  let overdueFollowUpsCount = 0;

  const stageCounts: Record<OpportunityStage, number> = {
    NEW_LEAD: 0,
    QUALIFIED: 0,
    PROPOSAL: 0,
    NEGOTIATION: 0,
    WON: 0,
    LOST: 0,
  };

  const stageValues: Record<OpportunityStage, number> = {
    NEW_LEAD: 0,
    QUALIFIED: 0,
    PROPOSAL: 0,
    NEGOTIATION: 0,
    WON: 0,
    LOST: 0,
  };

  for (const opp of opportunities) {
    const stage = opp.stage;
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    stageValues[stage] = Number(
      ((stageValues[stage] || 0) + Number(opp.estimatedValue || 0)).toFixed(2),
    );

    if (stage === "WON") {
      wonCount += 1;
    } else if (stage === "LOST") {
      lostCount += 1;
    } else {
      openCount += 1;
      totalPipelineValue += Number(opp.estimatedValue || 0);
      weightedPipelineValue += Number(opp.weightedValue || 0);

      if (isOpportunityOverdue(opp.nextFollowUpDate, stage, referenceDate)) {
        overdueFollowUpsCount += 1;
      }
    }
  }

  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? Number(((wonCount / closedCount) * 100).toFixed(1)) : 0;

  return {
    totalPipelineValue: Number(totalPipelineValue.toFixed(2)),
    weightedPipelineValue: Number(weightedPipelineValue.toFixed(2)),
    openCount,
    wonCount,
    lostCount,
    winRate,
    overdueFollowUpsCount,
    stageCounts,
    stageValues,
  };
};
