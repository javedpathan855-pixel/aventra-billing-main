import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { RecurringScheduleStatus as PrismaScheduleStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import type { RecurringSchedule } from "../../domain/recurring-schedule";
import type {
  IRecurringScheduleRepository,
  IOccurrenceRepository,
  RecurringScheduleFilterCriteria,
  SaveRecurringScheduleInput,
} from "../../domain/repositories/recurring-schedule-repository";
import {
  toDomainOccurrence,
  toDomainSchedule,
  toPrismaFrequency,
  toPrismaScheduleStatus,
} from "../mappers/prisma-recurring-mapper";

const Decimal = Prisma.Decimal;

export class PrismaRecurringScheduleRepository implements IRecurringScheduleRepository {
  async findById(organizationId: string, id: string): Promise<RecurringSchedule | null> {
    const prisma = getPrisma();
    const record = await prisma.recurringSchedule.findFirst({
      where: { organizationId, id },
      include: { items: true },
    });
    if (!record) return null;
    return toDomainSchedule(record);
  }

  async findMany(
    organizationId: string,
    criteria?: RecurringScheduleFilterCriteria,
  ): Promise<RecurringSchedule[]> {
    const prisma = getPrisma();
    const whereClause: Prisma.RecurringScheduleWhereInput = { organizationId };

    if (criteria?.status) {
      whereClause.status = toPrismaScheduleStatus(criteria.status);
    }
    if (criteria?.customerId) {
      whereClause.customerId = criteria.customerId;
    }
    if (criteria?.frequency) {
      whereClause.frequency = toPrismaFrequency(criteria.frequency);
    }
    if (criteria?.query) {
      const q = criteria.query.trim();
      whereClause.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
      ];
    }
    if (criteria?.startDate || criteria?.endDate) {
      whereClause.nextRunDate = {
        ...(criteria.startDate && { gte: new Date(criteria.startDate) }),
        ...(criteria.endDate && { lte: new Date(criteria.endDate) }),
      };
    }

    const records = await prisma.recurringSchedule.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { nextRunDate: "asc" },
    });
    return records.map(toDomainSchedule);
  }

  async findActiveSchedules(limit = 100): Promise<RecurringSchedule[]> {
    const prisma = getPrisma();
    const records = await prisma.recurringSchedule.findMany({
      where: { status: PrismaScheduleStatus.ACTIVE },
      include: { items: true },
      orderBy: { nextRunDate: "asc" },
      take: Math.max(1, Math.min(500, limit)),
    });
    return records.map(toDomainSchedule);
  }

  async create(
    input: SaveRecurringScheduleInput & { createdBy?: string | null },
  ): Promise<RecurringSchedule> {
    const prisma = getPrisma();
    const record = await prisma.recurringSchedule.create({
      data: {
        id: input.id,
        organizationId: input.organizationId,
        name: input.name,
        customerId: input.customerId ?? null,
        customerName: input.customerName,
        customerEmail: input.customerEmail ?? null,
        customerAddress: input.customerAddress ?? null,
        customerGstin: input.customerGstin ?? null,
        customerPlaceOfSupply: input.customerPlaceOfSupply ?? null,
        frequency: toPrismaFrequency(input.frequency),
        startDate: new Date(`${input.startDate}T00:00:00.000Z`),
        endDate: input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null,
        nextRunDate: new Date(`${input.nextRunDate}T00:00:00.000Z`),
        timezone: input.timezone,
        status: toPrismaScheduleStatus(input.status),
        paymentTerms: input.paymentTerms,
        additionalCharges: new Decimal(input.additionalCharges),
        additionalChargesLabel: input.additionalChargesLabel ?? null,
        additionalDiscount: new Decimal(input.additionalDiscount),
        additionalDiscountType: input.additionalDiscountType,
        additionalDiscountLabel: input.additionalDiscountLabel ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        createdBy: input.createdBy ?? null,
        items: {
          create: input.items.map((it) => ({
            id: it.id,
            productId: it.productId ?? null,
            item: it.item,
            description: it.description ?? null,
            hsnSac: it.hsnSac ?? null,
            quantity: new Decimal(it.quantity),
            unitPrice: new Decimal(it.unitPrice),
            discount: new Decimal(it.discount),
            taxRate: new Decimal(it.taxRate),
            sortOrder: it.sortOrder,
          })),
        },
      },
      include: { items: true },
    });
    return toDomainSchedule(record);
  }

  async update(
    organizationId: string,
    id: string,
    input: SaveRecurringScheduleInput,
  ): Promise<RecurringSchedule> {
    const prisma = getPrisma();
    const record = await prisma.$transaction(async (tx) => {
      await tx.recurringScheduleItem.deleteMany({ where: { scheduleId: id } });
      return await tx.recurringSchedule.update({
        where: { id, organizationId },
        data: {
          name: input.name,
          customerId: input.customerId ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? null,
          customerAddress: input.customerAddress ?? null,
          customerGstin: input.customerGstin ?? null,
          customerPlaceOfSupply: input.customerPlaceOfSupply ?? null,
          frequency: toPrismaFrequency(input.frequency),
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null,
          nextRunDate: new Date(`${input.nextRunDate}T00:00:00.000Z`),
          timezone: input.timezone,
          status: toPrismaScheduleStatus(input.status),
          paymentTerms: input.paymentTerms,
          additionalCharges: new Decimal(input.additionalCharges),
          additionalChargesLabel: input.additionalChargesLabel ?? null,
          additionalDiscount: new Decimal(input.additionalDiscount),
          additionalDiscountType: input.additionalDiscountType,
          additionalDiscountLabel: input.additionalDiscountLabel ?? null,
          notes: input.notes ?? null,
          terms: input.terms ?? null,
          items: {
            create: input.items.map((it) => ({
              id: it.id,
              productId: it.productId ?? null,
              item: it.item,
              description: it.description ?? null,
              hsnSac: it.hsnSac ?? null,
              quantity: new Decimal(it.quantity),
              unitPrice: new Decimal(it.unitPrice),
              discount: new Decimal(it.discount),
              taxRate: new Decimal(it.taxRate),
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: { items: true },
      });
    });
    return toDomainSchedule(record);
  }

  async updateProgress(
    organizationId: string,
    id: string,
    progress: {
      nextRunDate?: string;
      status?: RecurringSchedule["status"];
      successCount?: number;
      failureCount?: number;
      consecutiveFailures?: number;
      lastRunAt?: Date;
      lastResult?: string | null;
    },
    txClient?: unknown,
  ): Promise<void> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    await prisma.recurringSchedule.update({
      where: { id, organizationId },
      data: {
        ...(progress.nextRunDate !== undefined && {
          nextRunDate: new Date(`${progress.nextRunDate}T00:00:00.000Z`),
        }),
        ...(progress.status !== undefined && { status: toPrismaScheduleStatus(progress.status) }),
        ...(progress.successCount !== undefined && { successCount: progress.successCount }),
        ...(progress.failureCount !== undefined && { failureCount: progress.failureCount }),
        ...(progress.consecutiveFailures !== undefined && {
          consecutiveFailures: progress.consecutiveFailures,
        }),
        ...(progress.lastRunAt !== undefined && { lastRunAt: progress.lastRunAt }),
        ...(progress.lastResult !== undefined && { lastResult: progress.lastResult }),
      },
    });
  }

  async delete(organizationId: string, id: string): Promise<number> {
    const prisma = getPrisma();
    // Only schedules with no succeeded generations may be deleted; anything
    // with financial history must be completed/cancelled instead so history
    // (occurrences + generated invoices) is never silently removed.
    const succeeded = await prisma.recurringOccurrence.count({
      where: { scheduleId: id, organizationId, status: "SUCCEEDED" },
    });
    if (succeeded > 0) {
      return 0;
    }
    const result = await prisma.recurringSchedule.deleteMany({
      where: { id, organizationId },
    });
    return result.count;
  }
}

export class PrismaOccurrenceRepository implements IOccurrenceRepository {
  async findById(organizationId: string, id: string) {
    const prisma = getPrisma();
    const record = await prisma.recurringOccurrence.findFirst({
      where: { organizationId, id },
      include: { invoice: { select: { invoiceNumber: true } } },
    });
    if (!record) return null;
    return toDomainOccurrence(record);
  }

  async findBySchedule(organizationId: string, scheduleId: string) {
    const prisma = getPrisma();
    const records = await prisma.recurringOccurrence.findMany({
      where: { organizationId, scheduleId },
      include: { invoice: { select: { invoiceNumber: true } } },
      orderBy: { periodKey: "desc" },
    });
    return records.map(toDomainOccurrence);
  }

  async findByPeriod(
    organizationId: string,
    scheduleId: string,
    periodKey: string,
    txClient?: unknown,
  ) {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const record = await prisma.recurringOccurrence.findUnique({
      where: { scheduleId_periodKey: { scheduleId, periodKey } },
      include: { invoice: { select: { invoiceNumber: true } } },
    });
    if (!record || record.organizationId !== organizationId) return null;
    return toDomainOccurrence(record);
  }

  async claimPeriod(
    organizationId: string,
    scheduleId: string,
    periodKey: string,
    claimedBy: string,
    txClient?: unknown,
  ) {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const now = new Date();
    // Atomic claim: exactly one worker wins the INSERT; conflicts mean the
    // occurrence already exists (claimed, succeeded, or failed).
    const created = await prisma.recurringOccurrence.createMany({
      data: [
        {
          id: `occ_${crypto.randomUUID()}`,
          organizationId,
          scheduleId,
          periodKey,
          status: "PROCESSING",
          attempts: 1,
          claimedAt: now,
          claimedBy,
        },
      ],
      skipDuplicates: true,
    });
    if (created.count === 1) {
      const record = await prisma.recurringOccurrence.findUnique({
        where: { scheduleId_periodKey: { scheduleId, periodKey } },
        include: { invoice: { select: { invoiceNumber: true } } },
      });
      return {
        claimed: true,
        occurrence: record ? toDomainOccurrence(record) : null,
      };
    }
    const existing = await prisma.recurringOccurrence.findUnique({
      where: { scheduleId_periodKey: { scheduleId, periodKey } },
      include: { invoice: { select: { invoiceNumber: true } } },
    });
    if (!existing || existing.organizationId !== organizationId) {
      return { claimed: false, occurrence: null };
    }
    return { claimed: false, occurrence: toDomainOccurrence(existing) };
  }

  async markProcessing(
    organizationId: string,
    id: string,
    claimedBy: string,
    txClient?: unknown,
  ): Promise<boolean> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    // Conditional transition: only a Pending occurrence can be claimed.
    const result = await prisma.recurringOccurrence.updateMany({
      where: { id, organizationId, status: "PENDING" },
      data: {
        status: "PROCESSING",
        claimedAt: new Date(),
        claimedBy,
        attempts: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async markSucceeded(
    organizationId: string,
    id: string,
    invoiceId: string,
    txClient?: unknown,
  ): Promise<void> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    await prisma.recurringOccurrence.updateMany({
      where: { id, organizationId },
      data: { status: "SUCCEEDED", invoiceId, error: null },
    });
  }

  async markFailed(
    organizationId: string,
    id: string,
    error: string,
    txClient?: unknown,
  ): Promise<void> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    await prisma.recurringOccurrence.updateMany({
      where: { id, organizationId },
      data: { status: "FAILED", error: error.slice(0, 500) },
    });
  }

  async registerFailure(
    organizationId: string,
    id: string,
    error: string,
    txClient?: unknown,
  ): Promise<number> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    // Every processing try counts exactly once toward the retry budget.
    const updated = await prisma.recurringOccurrence.updateMany({
      where: { id, organizationId },
      data: { attempts: { increment: 1 }, error: error.slice(0, 500) },
    });
    if (updated.count === 0) return 0;
    const record = await prisma.recurringOccurrence.findFirst({
      where: { id, organizationId },
      select: { attempts: true },
    });
    return record?.attempts ?? 0;
  }

  async resetToPending(organizationId: string, id: string, txClient?: unknown): Promise<void> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    // Releases the claim for retry but preserves the last error so failed
    // attempts stay visible in generation history. markSucceeded clears it.
    await prisma.recurringOccurrence.updateMany({
      where: { id, organizationId },
      data: { status: "PENDING", claimedAt: null, claimedBy: null },
    });
  }

  async findInvoiceForPeriod(
    scheduleId: string,
    periodKey: string,
    txClient?: unknown,
  ): Promise<{ id: string; invoiceNumber: string } | null> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const record = await prisma.invoice.findFirst({
      where: { recurringScheduleId: scheduleId, recurringPeriod: periodKey },
      select: { id: true, invoiceNumber: true },
    });
    return record;
  }
}

export const recurringScheduleRepository = new PrismaRecurringScheduleRepository();
export const occurrenceRepository = new PrismaOccurrenceRepository();
