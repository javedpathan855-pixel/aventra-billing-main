import "server-only";

import { resolveSalesPipelineContext } from "../context/sales-pipeline-context";
import { salesOpportunityRepository } from "../../infrastructure/repositories/prisma-sales-opportunity-repository";
import type {
  SalesOpportunity,
  OpportunityFilter,
} from "../../domain/entities/sales-opportunity";

export const getSalesOpportunities = async (
  filter?: OpportunityFilter,
): Promise<SalesOpportunity[]> => {
  const { organizationId } = await resolveSalesPipelineContext();
  return salesOpportunityRepository.findMany(organizationId, filter);
};
