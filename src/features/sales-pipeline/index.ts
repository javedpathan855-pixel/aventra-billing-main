// Domain Entities & Types
export type {
  OpportunityStage,
  SalesOpportunity,
  OpportunityMetrics,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpdateOpportunityStageInput,
  OpportunityFilter,
} from "./domain/entities/sales-opportunity";

// Domain Errors
export {
  SalesPipelineDomainError,
  OpportunityNotFoundError,
  InvalidOpportunityStageTransitionError,
  InvalidOpportunityCustomerReferenceError,
  MandatoryLossReasonError,
} from "./domain/errors/sales-pipeline-errors";

// Domain Rules
export {
  STAGE_DEFAULT_PROBABILITIES,
  PIPELINE_STAGES,
  ALLOWED_STAGE_TRANSITIONS,
  canTransitionOpportunityStage,
  validateOpportunityStageTransition,
  calculateWeightedOpportunityValue,
  validateProbability,
  assertLossReasonWhenLost,
  isOpportunityOverdue,
  calculatePipelineMetrics,
} from "./domain/rules/sales-pipeline-rules";

// Queries
export { getSalesOpportunities } from "./data/queries/get-sales-opportunities";
export { getSalesOpportunityById } from "./data/queries/get-sales-opportunity-by-id";
export { getOpportunityMetrics } from "./data/queries/get-opportunity-metrics";

// Mutations / Actions
export { createOpportunityAction } from "./data/mutations/create-opportunity";
export { updateOpportunityAction } from "./data/mutations/update-opportunity";
export { updateOpportunityStageAction } from "./data/mutations/update-opportunity-stage";
export { deleteOpportunityAction } from "./data/mutations/delete-opportunity";

// Presentation Components & Pages
export { OpportunityStageBadge } from "./presentation/components/OpportunityStageBadge";
export { PipelineMetricsCards } from "./presentation/components/PipelineMetricsCards";
export { PipelineKanbanBoard } from "./presentation/components/PipelineKanbanBoard";
export { PipelineTable } from "./presentation/components/PipelineTable";
export { SalesPipelinePage } from "./presentation/page/SalesPipelinePage";
export { OpportunityCreatePage } from "./presentation/page/OpportunityCreatePage";
export { OpportunityDetailPage } from "./presentation/page/OpportunityDetailPage";
