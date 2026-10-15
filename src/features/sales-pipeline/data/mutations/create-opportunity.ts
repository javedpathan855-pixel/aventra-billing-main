"use server";

import { revalidatePath } from "next/cache";
import { resolveSalesPipelineContext } from "../context/sales-pipeline-context";
import { salesOpportunityRepository } from "../../infrastructure/repositories/prisma-sales-opportunity-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import { InvalidOpportunityCustomerReferenceError } from "../../domain/errors/sales-pipeline-errors";
import { createOpportunitySchema } from "../validators/sales-opportunity-schemas";
import type {
  CreateOpportunityRequestDTO,
  OpportunityActionResult,
} from "../dto/sales-opportunity-dto";
import type { SalesOpportunity } from "../../domain/entities/sales-opportunity";

export const createOpportunityAction = async (
  input: CreateOpportunityRequestDTO,
): Promise<OpportunityActionResult<SalesOpportunity>> => {
  try {
    const { organizationId } = await resolveSalesPipelineContext();

    const parseResult = createOpportunitySchema.safeParse(input);
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

    if (data.customerId) {
      const customer = await customerRepository.findById(
        organizationId,
        data.customerId,
      );
      if (!customer) {
        throw new InvalidOpportunityCustomerReferenceError(data.customerId);
      }
    }

    const created = await salesOpportunityRepository.create(organizationId, {
      title: data.title,
      customerId: data.customerId || null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerPhone: data.customerPhone || null,
      contactPerson: data.contactPerson || null,
      description: data.description || null,
      source: data.source || "Website",
      stage: data.stage || "NEW_LEAD",
      estimatedValue: data.estimatedValue,
      currency: data.currency || "INR (₹)",
      probability: data.probability,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
      assignedTo: data.assignedTo || null,
      nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      nextAction: data.nextAction || null,
      notes: data.notes || null,
    });

    revalidatePath("/sales-pipeline");
    return {
      success: true,
      data: created,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create opportunity.";
    return {
      success: false,
      error: message,
    };
  }
};
