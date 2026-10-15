import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type {
  SalesOpportunity,
  OpportunityMetrics,
  OpportunityFilter,
  OpportunityStage,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpdateOpportunityStageInput,
} from "../../domain/entities/sales-opportunity";
import type { SalesOpportunityRepository } from "../../domain/repositories/sales-opportunity-repository";
import {
  STAGE_DEFAULT_PROBABILITIES,
  assertLossReasonWhenLost,
  calculatePipelineMetrics,
  validateOpportunityStageTransition,
  validateProbability,
} from "../../domain/rules/sales-pipeline-rules";
import { OpportunityNotFoundError } from "../../domain/errors/sales-pipeline-errors";
import { toDomainSalesOpportunity } from "../mappers/prisma-sales-opportunity-mapper";

export class PrismaSalesOpportunityRepository implements SalesOpportunityRepository {
  async findMany(
    organizationId: string,
    filter?: OpportunityFilter,
  ): Promise<SalesOpportunity[]> {
    const prisma = getPrisma();
    const where: Prisma.SalesOpportunityWhereInput = {
      organizationId,
    };

    if (filter?.stage) {
      where.stage = filter.stage;
    }

    if (filter?.assignedTo) {
      where.assignedTo = filter.assignedTo;
    }

    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }

    if (filter?.isOverdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.nextFollowUpDate = {
        lt: today,
      };
      where.stage = {
        notIn: ["WON", "LOST"],
      };
    }

    if (filter?.search) {
      const term = filter.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { customerName: { contains: term, mode: "insensitive" } },
        { customerEmail: { contains: term, mode: "insensitive" } },
        { contactPerson: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const rows = await prisma.salesOpportunity.findMany({
      where,
      include: {
        estimate: { select: { estimateNumber: true } },
        salesOrder: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(toDomainSalesOpportunity);
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<SalesOpportunity | null> {
    const prisma = getPrisma();
    const row = await prisma.salesOpportunity.findFirst({
      where: { id, organizationId },
      include: {
        estimate: { select: { estimateNumber: true } },
        salesOrder: { select: { orderNumber: true } },
      },
    });

    return row ? toDomainSalesOpportunity(row) : null;
  }

  async getMetrics(organizationId: string): Promise<OpportunityMetrics> {
    const allOpportunities = await this.findMany(organizationId);
    return calculatePipelineMetrics(allOpportunities);
  }

  async create(
    organizationId: string,
    input: CreateOpportunityInput,
  ): Promise<SalesOpportunity> {
    const prisma = getPrisma();
    const stage = input.stage || "NEW_LEAD";
    const probability =
      input.probability !== undefined
        ? input.probability
        : STAGE_DEFAULT_PROBABILITIES[stage];

    validateProbability(probability);

    const row = await prisma.salesOpportunity.create({
      data: {
        id: `opp_${crypto.randomUUID()}`,
        organizationId,
        title: input.title,
        customerId: input.customerId || null,
        customerName: input.customerName,
        customerEmail: input.customerEmail || null,
        customerPhone: input.customerPhone || null,
        contactPerson: input.contactPerson || null,
        description: input.description || null,
        source: input.source || "Website",
        stage,
        estimatedValue: input.estimatedValue,
        currency: input.currency || "INR (₹)",
        probability,
        expectedCloseDate: input.expectedCloseDate || null,
        assignedTo: input.assignedTo || null,
        nextFollowUpDate: input.nextFollowUpDate || null,
        nextAction: input.nextAction || null,
        notes: input.notes || null,
      },
      include: {
        estimate: { select: { estimateNumber: true } },
        salesOrder: { select: { orderNumber: true } },
      },
    });

    return toDomainSalesOpportunity(row);
  }

  async update(
    id: string,
    organizationId: string,
    input: UpdateOpportunityInput,
  ): Promise<SalesOpportunity> {
    const prisma = getPrisma();
    const existing = await prisma.salesOpportunity.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new OpportunityNotFoundError(id);
    }

    if (input.stage !== undefined && input.stage !== existing.stage) {
      validateOpportunityStageTransition(
        existing.stage as OpportunityStage,
        input.stage,
      );
    }

    if (input.stage === "LOST") {
      assertLossReasonWhenLost("LOST", input.lossReason || existing.lossReason);
    }

    if (input.probability !== undefined) {
      validateProbability(input.probability);
    }

    const row = await prisma.salesOpportunity.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.customerId !== undefined && { customerId: input.customerId }),
        ...(input.customerName !== undefined && { customerName: input.customerName }),
        ...(input.customerEmail !== undefined && { customerEmail: input.customerEmail }),
        ...(input.customerPhone !== undefined && { customerPhone: input.customerPhone }),
        ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.source !== undefined && { source: input.source }),
        ...(input.stage !== undefined && { stage: input.stage }),
        ...(input.estimatedValue !== undefined && { estimatedValue: input.estimatedValue }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.probability !== undefined && { probability: input.probability }),
        ...(input.expectedCloseDate !== undefined && { expectedCloseDate: input.expectedCloseDate }),
        ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
        ...(input.nextFollowUpDate !== undefined && { nextFollowUpDate: input.nextFollowUpDate }),
        ...(input.nextAction !== undefined && { nextAction: input.nextAction }),
        ...(input.lossReason !== undefined && { lossReason: input.lossReason }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: {
        estimate: { select: { estimateNumber: true } },
        salesOrder: { select: { orderNumber: true } },
      },
    });

    return toDomainSalesOpportunity(row);
  }

  async updateStage(
    id: string,
    organizationId: string,
    input: UpdateOpportunityStageInput,
  ): Promise<SalesOpportunity> {
    const prisma = getPrisma();
    const existing = await prisma.salesOpportunity.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new OpportunityNotFoundError(id);
    }

    validateOpportunityStageTransition(
      existing.stage as OpportunityStage,
      input.stage,
    );

    assertLossReasonWhenLost(input.stage, input.lossReason);

    // Automatically set probability based on stage transition if moving to WON or LOST
    let newProb = existing.probability;
    if (input.stage === "WON") {
      newProb = 100;
    } else if (input.stage === "LOST") {
      newProb = 0;
    } else if (existing.stage === "LOST" || existing.stage === "WON") {
      newProb = STAGE_DEFAULT_PROBABILITIES[input.stage];
    }

    const row = await prisma.salesOpportunity.update({
      where: { id },
      data: {
        stage: input.stage,
        probability: newProb,
        lossReason: input.stage === "LOST" ? input.lossReason : null,
      },
      include: {
        estimate: { select: { estimateNumber: true } },
        salesOrder: { select: { orderNumber: true } },
      },
    });

    return toDomainSalesOpportunity(row);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const prisma = getPrisma();
    const existing = await prisma.salesOpportunity.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new OpportunityNotFoundError(id);
    }

    await prisma.salesOpportunity.delete({
      where: { id },
    });

    return true;
  }

  async linkEstimate(
    opportunityId: string,
    estimateId: string,
    organizationId: string,
  ): Promise<void> {
    const prisma = getPrisma();
    await prisma.salesOpportunity.updateMany({
      where: { id: opportunityId, organizationId },
      data: { estimateId, stage: "PROPOSAL" },
    });
  }

  async linkSalesOrder(
    opportunityId: string,
    salesOrderId: string,
    organizationId: string,
  ): Promise<void> {
    const prisma = getPrisma();
    await prisma.salesOpportunity.updateMany({
      where: { id: opportunityId, organizationId },
      data: { salesOrderId, stage: "WON", probability: 100 },
    });
  }
}

export const salesOpportunityRepository = new PrismaSalesOpportunityRepository();
