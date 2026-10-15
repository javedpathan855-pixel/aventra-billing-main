"use server";

import { revalidatePath } from "next/cache";
import { resolveSalesPipelineContext } from "../context/sales-pipeline-context";
import { salesOpportunityRepository } from "../../infrastructure/repositories/prisma-sales-opportunity-repository";
import { OpportunityNotFoundError } from "../../domain/errors/sales-pipeline-errors";
import { validateOpportunityStageTransition } from "../../domain/rules/sales-pipeline-rules";
import { updateOpportunityStageSchema } from "../validators/sales-opportunity-schemas";
import type {
  UpdateOpportunityStageRequestDTO,
  OpportunityActionResult,
} from "../dto/sales-opportunity-dto";
import type { SalesOpportunity } from "../../domain/entities/sales-opportunity";

export const updateOpportunityStageAction = async (
  id: string,
  input: UpdateOpportunityStageRequestDTO,
): Promise<OpportunityActionResult<SalesOpportunity>> => {
  try {
    const { organizationId } = await resolveSalesPipelineContext();

    const parseResult = updateOpportunityStageSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const data = parseResult.data;

    const existing = await salesOpportunityRepository.findById(id, organizationId);
    if (!existing) {
      throw new OpportunityNotFoundError(id);
    }

    validateOpportunityStageTransition(existing.stage, data.stage);

    const updated = await salesOpportunityRepository.updateStage(id, organizationId, {
      stage: data.stage,
      lossReason: data.lossReason || null,
    });

    revalidatePath("/sales-pipeline");
    revalidatePath(`/sales-pipeline/${id}`);
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update opportunity stage.";
    return {
      success: false,
      error: message,
    };
  }
};
