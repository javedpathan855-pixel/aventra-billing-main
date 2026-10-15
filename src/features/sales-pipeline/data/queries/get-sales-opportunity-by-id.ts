import "server-only";

import { resolveSalesPipelineContext } from "../context/sales-pipeline-context";
import { salesOpportunityRepository } from "../../infrastructure/repositories/prisma-sales-opportunity-repository";
import type { SalesOpportunity } from "../../domain/entities/sales-opportunity";

export const getSalesOpportunityById = async (
  id: string,
): Promise<SalesOpportunity | null> => {
  const { organizationId } = await resolveSalesPipelineContext();
  return salesOpportunityRepository.findById(id, organizationId);
};
