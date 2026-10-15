import type { OpportunityStage } from "../../domain/entities/sales-opportunity";

export type OpportunityDTO = {
  id: string;
  organizationId: string;
  title: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  contactPerson: string | null;
  description: string | null;
  source: string;
  stage: OpportunityStage;
  estimatedValue: number;
  currency: string;
  probability: number;
  weightedValue: number;
  expectedCloseDate: string | null;
  assignedTo: string | null;
  nextFollowUpDate: string | null;
  nextAction: string | null;
  lossReason: string | null;
  estimateId: string | null;
  estimateNumber: string | null;
  salesOrderId: string | null;
  salesOrderNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OpportunityMetricsDTO = {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  overdueFollowUpsCount: number;
  stageCounts: Record<OpportunityStage, number>;
  stageValues: Record<OpportunityStage, number>;
};

export type CreateOpportunityRequestDTO = {
  title: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  contactPerson?: string | null;
  description?: string | null;
  source?: string;
  stage?: OpportunityStage;
  estimatedValue: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  assignedTo?: string | null;
  nextFollowUpDate?: string | null;
  nextAction?: string | null;
  notes?: string | null;
};

export type UpdateOpportunityRequestDTO = {
  title?: string;
  customerId?: string | null;
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  contactPerson?: string | null;
  description?: string | null;
  source?: string;
  stage?: OpportunityStage;
  estimatedValue?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  assignedTo?: string | null;
  nextFollowUpDate?: string | null;
  nextAction?: string | null;
  lossReason?: string | null;
  notes?: string | null;
};

export type UpdateOpportunityStageRequestDTO = {
  stage: OpportunityStage;
  lossReason?: string | null;
};

export type OpportunityActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
