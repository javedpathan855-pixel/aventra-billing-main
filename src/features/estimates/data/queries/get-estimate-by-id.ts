import "server-only";

import { resolveEstimateContext } from "../context/estimate-context";
import { estimateRepository } from "../../infrastructure/repositories/prisma-estimate-repository";
import type { Estimate } from "../../domain/entities/estimate";

export const getEstimateById = async (id: string): Promise<Estimate | null> => {
  const { organizationId } = await resolveEstimateContext();
  return estimateRepository.findById(organizationId, id);
};
