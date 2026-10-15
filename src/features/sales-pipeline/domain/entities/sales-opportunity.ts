export type OpportunityStage =
  | "NEW_LEAD"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export interface SalesOpportunity {
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
  probability: number; // 0 - 100
  weightedValue: number; // calculated: (estimatedValue * probability) / 100
  expectedCloseDate: Date | null;
  assignedTo: string | null;
  nextFollowUpDate: Date | null;
  nextAction: string | null;
  lossReason: string | null;
  estimateId: string | null;
  estimateNumber: string | null;
  salesOrderId: string | null;
  salesOrderNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpportunityMetrics {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
  winRate: number; // percentage (won / (won + lost) * 100) or won / total * 100
  overdueFollowUpsCount: number;
  stageCounts: Record<OpportunityStage, number>;
  stageValues: Record<OpportunityStage, number>;
}

export interface CreateOpportunityInput {
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
  expectedCloseDate?: Date | null;
  assignedTo?: string | null;
  nextFollowUpDate?: Date | null;
  nextAction?: string | null;
  notes?: string | null;
}

export interface UpdateOpportunityInput {
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
  expectedCloseDate?: Date | null;
  assignedTo?: string | null;
  nextFollowUpDate?: Date | null;
  nextAction?: string | null;
  lossReason?: string | null;
  notes?: string | null;
}

export interface UpdateOpportunityStageInput {
  stage: OpportunityStage;
  lossReason?: string | null;
}

export interface OpportunityFilter {
  search?: string;
  stage?: OpportunityStage;
  assignedTo?: string;
  customerId?: string;
  isOverdue?: boolean;
}
