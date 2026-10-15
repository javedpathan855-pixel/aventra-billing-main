"use server";

import { revalidatePath } from "next/cache";
import { resolveSalesPipelineContext } from "../context/sales-pipeline-context";
import { salesOpportunityRepository } from "../../infrastructure/repositories/prisma-sales-opportunity-repository";
import type { OpportunityActionResult } from "../dto/sales-opportunity-dto";

export const deleteOpportunityAction = async (
  id: string,
): Promise<OpportunityActionResult<boolean>> => {
  try {
    const { organizationId } = await resolveSalesPipelineContext();
    const success = await salesOpportunityRepository.delete(id, organizationId);
    revalidatePath("/sales-pipeline");
    return {
      success,
      data: success,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete opportunity.";
    return {
      success: false,
      error: message,
    };
  }
};
