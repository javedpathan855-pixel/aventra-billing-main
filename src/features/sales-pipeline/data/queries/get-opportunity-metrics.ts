import "server-only";

import { resolveSalesPipelineContext } from "../context/sales-pipeline-context";
import { salesOpportunityRepository } from "../../infrastructure/repositories/prisma-sales-opportunity-repository";
import type { OpportunityMetrics } from "../../domain/entities/sales-opportunity";

export const getOpportunityMetrics = async (): Promise<OpportunityMetrics> => {
  const { organizationId } = await resolveSalesPipelineContext();
  return salesOpportunityRepository.getMetrics(organizationId);
};
