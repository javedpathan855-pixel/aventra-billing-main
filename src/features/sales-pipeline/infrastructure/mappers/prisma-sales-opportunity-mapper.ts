import type { SalesOpportunity as PrismaSalesOpportunity } from "@/generated/prisma/client";
import type {
  SalesOpportunity,
  OpportunityStage,
} from "../../domain/entities/sales-opportunity";
import { calculateWeightedOpportunityValue } from "../../domain/rules/sales-pipeline-rules";

type PrismaSalesOpportunityWithRelations = PrismaSalesOpportunity & {
  estimate?: { estimateNumber: string } | null;
  salesOrder?: { orderNumber: string } | null;
};

export const toDomainSalesOpportunity = (
  raw: PrismaSalesOpportunityWithRelations,
): SalesOpportunity => {
  const estimatedValue = Number(raw.estimatedValue);
  const probability = Number(raw.probability);
  const weightedValue = calculateWeightedOpportunityValue(estimatedValue, probability);

  return {
    id: raw.id,
    organizationId: raw.organizationId,
    title: raw.title,
    customerId: raw.customerId,
    customerName: raw.customerName,
    customerEmail: raw.customerEmail,
    customerPhone: raw.customerPhone,
    contactPerson: raw.contactPerson,
    description: raw.description,
    source: raw.source,
    stage: raw.stage as OpportunityStage,
    estimatedValue,
    currency: raw.currency,
    probability,
    weightedValue,
    expectedCloseDate: raw.expectedCloseDate,
    assignedTo: raw.assignedTo,
    nextFollowUpDate: raw.nextFollowUpDate,
    nextAction: raw.nextAction,
    lossReason: raw.lossReason,
    estimateId: raw.estimateId,
    estimateNumber: raw.estimate?.estimateNumber ?? null,
    salesOrderId: raw.salesOrderId,
    salesOrderNumber: raw.salesOrder?.orderNumber ?? null,
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};
