import "server-only";

import { resolveEstimateContext } from "../context/estimate-context";
import { estimateRepository } from "../../infrastructure/repositories/prisma-estimate-repository";
import type { Estimate } from "../../domain/entities/estimate";
import type { EstimateFilterCriteria } from "../../domain/repositories/estimate-repository";

export type GetEstimatesResult = {
  estimates: Estimate[];
  totalCount: number;
};

export const getEstimates = async (
  criteria?: EstimateFilterCriteria,
): Promise<GetEstimatesResult> => {
  const { organizationId } = await resolveEstimateContext();

  const estimates = await estimateRepository.findMany(organizationId, criteria);

  return {
    estimates,
    totalCount: estimates.length,
  };
};
