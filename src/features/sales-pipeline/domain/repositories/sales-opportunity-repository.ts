import type {
  SalesOpportunity,
  OpportunityMetrics,
  OpportunityFilter,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpdateOpportunityStageInput,
} from "../entities/sales-opportunity";

export interface SalesOpportunityRepository {
  findMany(organizationId: string, filter?: OpportunityFilter): Promise<SalesOpportunity[]>;
  findById(id: string, organizationId: string): Promise<SalesOpportunity | null>;
  getMetrics(organizationId: string): Promise<OpportunityMetrics>;
  create(organizationId: string, input: CreateOpportunityInput): Promise<SalesOpportunity>;
  update(id: string, organizationId: string, input: UpdateOpportunityInput): Promise<SalesOpportunity>;
  updateStage(id: string, organizationId: string, input: UpdateOpportunityStageInput): Promise<SalesOpportunity>;
  delete(id: string, organizationId: string): Promise<boolean>;
  linkEstimate(opportunityId: string, estimateId: string, organizationId: string): Promise<void>;
  linkSalesOrder(opportunityId: string, salesOrderId: string, organizationId: string): Promise<void>;
}
