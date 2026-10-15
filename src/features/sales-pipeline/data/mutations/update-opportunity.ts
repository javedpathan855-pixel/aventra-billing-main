"use server";

import { revalidatePath } from "next/cache";
import { resolveSalesPipelineContext } from "../context/sales-pipeline-context";
import { salesOpportunityRepository } from "../../infrastructure/repositories/prisma-sales-opportunity-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import {
  InvalidOpportunityCustomerReferenceError,
  OpportunityNotFoundError,
} from "../../domain/errors/sales-pipeline-errors";
import { validateOpportunityStageTransition } from "../../domain/rules/sales-pipeline-rules";
import { updateOpportunitySchema } from "../validators/sales-opportunity-schemas";
import type {
  UpdateOpportunityRequestDTO,
  OpportunityActionResult,
} from "../dto/sales-opportunity-dto";
import type { SalesOpportunity } from "../../domain/entities/sales-opportunity";

export const updateOpportunityAction = async (
  id: string,
  input: UpdateOpportunityRequestDTO,
): Promise<OpportunityActionResult<SalesOpportunity>> => {
  try {
    const { organizationId } = await resolveSalesPipelineContext();

    const parseResult = updateOpportunitySchema.safeParse(input);
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

    if (data.customerId) {
      const customer = await customerRepository.findById(
        organizationId,
        data.customerId,
      );
      if (!customer) {
        throw new InvalidOpportunityCustomerReferenceError(data.customerId);
      }
    }

    if (data.stage && data.stage !== existing.stage) {
      validateOpportunityStageTransition(existing.stage, data.stage);
    }

    const updated = await salesOpportunityRepository.update(id, organizationId, {
      title: data.title,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      contactPerson: data.contactPerson,
      description: data.description,
      source: data.source,
      stage: data.stage,
      estimatedValue: data.estimatedValue,
      currency: data.currency,
      probability: data.probability,
      expectedCloseDate:
        data.expectedCloseDate !== undefined
          ? data.expectedCloseDate
            ? new Date(data.expectedCloseDate)
            : null
          : undefined,
      assignedTo: data.assignedTo,
      nextFollowUpDate:
        data.nextFollowUpDate !== undefined
          ? data.nextFollowUpDate
            ? new Date(data.nextFollowUpDate)
            : null
          : undefined,
      nextAction: data.nextAction,
      lossReason: data.lossReason,
      notes: data.notes,
    });

    revalidatePath("/sales-pipeline");
    revalidatePath(`/sales-pipeline/${id}`);
    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update opportunity.";
    return {
      success: false,
      error: message,
    };
  }
};
