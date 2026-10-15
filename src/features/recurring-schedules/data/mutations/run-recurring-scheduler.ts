"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/shared/lib/prisma";
import {
  MAX_OCCURRENCES_PER_SCHEDULE_RUN,
  MAX_OCCURRENCE_ATTEMPTS,
  MAX_SCHEDULES_PER_RUN,
  STALE_CLAIM_MINUTES,
  type RecurringSchedule,
} from "../../domain/recurring-schedule";
import {
  advanceRecurrence,
  anchorDayOf,
  collectDuePeriods,
  isAfter,
  todayInTimezone,
} from "../../domain/rules/recurrence-rules";
import {
  occurrenceRepository,
  recurringScheduleRepository,
} from "../../infrastructure/repositories/prisma-recurring-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import { createInvoiceWithContext } from "@/features/invoices/data/mutations/invoice-mutations";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import {
  calculateDueDate,
  calculateInvoiceTotals,
  determineTaxMode,
} from "@/features/invoices";
import type { SchedulerRunSummary } from "../dto/recurring-schedule-dto";

export type ProcessSchedulesOptions = {
  /** Override for "now" (tests, dry runs). Defaults to the current time. */
  now?: Date;
  /** Maximum schedules per run. Defaults to MAX_SCHEDULES_PER_RUN. */
  limit?: number;
  /** Worker identity recorded on occurrence claims. */
  workerId?: string;
};

const emptySummary = (): SchedulerRunSummary => ({
  schedulesChecked: 0,
  occurrencesProcessed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
});

const isStaleClaim = (claimedAtIso: string | undefined, now: Date): boolean => {
  if (!claimedAtIso) return true;
  const claimedAt = new Date(claimedAtIso).getTime();
  if (Number.isNaN(claimedAt)) return true;
  return now.getTime() - claimedAt > STALE_CLAIM_MINUTES * 60 * 1000;
};

const sanitizeFailure = (err: unknown): string => {
  const message = err instanceof Error ? err.message : "Scheduled generation failed.";
  return message.slice(0, 500);
};

/**
 * Advances a schedule past one completed period inside the same transaction
 * as the occurrence outcome, so the two can never diverge. Completes the
 * schedule when the next run date passes its end date.
 */
const recordSuccess = async (
  organizationId: string,
  schedule: RecurringSchedule,
  occurrenceId: string,
  invoiceId: string,
  invoiceNumber: string,
  periodKey: string,
  now: Date,
  txClient?: unknown,
): Promise<void> => {
  const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
  const nextRunDate = advanceRecurrence({
    frequency: schedule.frequency,
    fromDate: periodKey,
    anchorDay: anchorDayOf(schedule.startDate),
  });
  const completed = Boolean(schedule.endDate && isAfter(nextRunDate, schedule.endDate));

  await prisma.$transaction(async (tx) => {
    await occurrenceRepository.markSucceeded(organizationId, occurrenceId, invoiceId, tx);
    await recurringScheduleRepository.updateProgress(
      organizationId,
      schedule.id,
      {
        nextRunDate,
        status: completed ? "Completed" : undefined,
        successCount: schedule.successCount + 1,
        consecutiveFailures: 0,
        lastRunAt: now,
        lastResult: `Invoice ${invoiceNumber} generated for ${periodKey}.`,
      },
      tx,
    );
  });
};

const recordFailure = async (
  organizationId: string,
  schedule: RecurringSchedule,
  occurrenceId: string,
  error: string,
  now: Date,
): Promise<void> => {
  const attempts = await occurrenceRepository.registerFailure(organizationId, occurrenceId, error);
  if (attempts >= MAX_OCCURRENCE_ATTEMPTS) {
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      await occurrenceRepository.markFailed(organizationId, occurrenceId, error, tx);
      await recurringScheduleRepository.updateProgress(
        organizationId,
        schedule.id,
        {
          failureCount: schedule.failureCount + 1,
          consecutiveFailures: schedule.consecutiveFailures + 1,
          // Auto-pause after exhausting retries so an invalid schedule cannot
          // retry forever without visible diagnostics.
          status: "Paused" as const,
          lastRunAt: now,
          lastResult: `Paused after ${attempts} failed attempts for ${schedule.nextRunDate}: ${error.slice(0, 200)}`,
        },
        tx,
      );
    });
    return;
  }
  await occurrenceRepository.resetToPending(organizationId, occurrenceId);
  await recurringScheduleRepository.updateProgress(organizationId, schedule.id, {
    failureCount: schedule.failureCount + 1,
    consecutiveFailures: schedule.consecutiveFailures + 1,
    lastRunAt: now,
    lastResult: `Attempt ${attempts} failed for ${schedule.nextRunDate}; will retry.`,
  });
};

type OccurrenceOutcome = "succeeded" | "failed" | "skipped";

/**
 * Processes a single claimed period: builds the invoice input from the
 * schedule snapshot (refreshing the customer block from the live master),
 * runs it through the shared invoice creation core (validation, tax,
 * numbering, snapshots), and records the outcome atomically with the
 * schedule advance. Failures never advance the schedule.
 */
const processClaimedOccurrence = async (
  schedule: RecurringSchedule,
  occurrenceId: string,
  periodKey: string,
  now: Date,
): Promise<OccurrenceOutcome> => {
  const organizationId = schedule.organizationId;

  try {
    // Refresh the customer block from the live master; the schedule snapshot
    // is the fallback. A deleted customer fails the occurrence visibly
    // instead of billing a ghost.
    let customerName = schedule.customerName;
    let customerEmail = schedule.customerEmail;
    let customerAddress = schedule.customerAddress;
    let customerGstin = schedule.customerGstin;
    let customerPlaceOfSupply = schedule.customerPlaceOfSupply;
    let customerId: string | undefined = schedule.customerId;
    if (schedule.customerId) {
      const live = await customerRepository.findById(organizationId, schedule.customerId);
      if (!live) {
        throw new Error(
          `Customer for schedule '${schedule.name}' no longer exists. Update or pause the schedule.`,
        );
      }
      customerName = live.name;
      customerEmail = live.email ?? "";
      customerAddress = live.billingAddress
        ? `${live.billingAddress.addressLine1}, ${live.billingAddress.city}, ${live.billingAddress.state} ${live.billingAddress.pinCode}`
        : "";
      customerGstin = live.gstin ?? "";
      customerPlaceOfSupply = live.placeOfSupply;
      customerId = live.id;
    }

    const supplierTax = await getSupplierTaxContext(organizationId);
    const taxDecision = determineTaxMode({
      supplierState: supplierTax.state,
      supplierGstin: supplierTax.gstNumber,
      customerPlaceOfSupply: customerPlaceOfSupply || "",
      customerGstin: customerGstin || undefined,
      customerState: undefined,
      gstTreatment: undefined,
    });

    const dueDate = calculateDueDate(periodKey, schedule.paymentTerms);

    const invoiceInput = {
      customerId,
      customerName,
      customerEmail: customerEmail || undefined,
      customerAddress: customerAddress || undefined,
      customerGstin: customerGstin || undefined,
      customerPlaceOfSupply: customerPlaceOfSupply || undefined,
      issueDate: periodKey,
      dueDate,
      paymentTerms: schedule.paymentTerms,
      status: "Issued" as const,
      taxMode: taxDecision.taxMode,
      notes: schedule.notes || undefined,
      terms: schedule.terms || undefined,
      items: schedule.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        item: it.item,
        description: it.description,
        hsnSac: it.hsnSac,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
      })),
      amountPaid: 0,
      additionalCharges: schedule.additionalCharges,
      additionalChargesLabel: schedule.additionalChargesLabel || undefined,
      additionalDiscount: schedule.additionalDiscount,
      additionalDiscountType: schedule.additionalDiscountType,
      additionalDiscountLabel: schedule.additionalDiscountLabel || undefined,
    };

    // Pre-flight totals so a degenerate template fails before touching the DB.
    const preview = calculateInvoiceTotals({
      items: schedule.items.map((it) => ({
        id: it.id,
        item: it.item,
        description: it.description,
        hsnSac: it.hsnSac,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
      })),
      amountPaid: 0,
      taxMode: taxDecision.taxMode,
      additionalCharges: schedule.additionalCharges,
      additionalDiscount: schedule.additionalDiscount,
      additionalDiscountType: schedule.additionalDiscountType,
    });
    if (preview.total <= 0) {
      throw new Error(
        `Schedule '${schedule.name}' computes a non-positive invoice total. Update the schedule.`,
      );
    }

    const created = await createInvoiceWithContext(
      {
        organizationId,
        // Standing issuance authorization: only owner/admin-activated
        // schedules reach the processor (activation is owner/admin-only).
        allowIssued: true,
        supplierTax,
        recurringLink: { recurringScheduleId: schedule.id, recurringPeriod: periodKey },
      },
      invoiceInput,
    );
    if (!created.success || !created.data) {
      throw new Error(created.error || "Invoice creation failed for the scheduled period.");
    }

    await recordSuccess(
      organizationId,
      schedule,
      occurrenceId,
      created.data.id,
      created.data.number,
      periodKey,
      now,
    );
    return "succeeded";
  } catch (err: unknown) {
    await recordFailure(organizationId, schedule, occurrenceId, sanitizeFailure(err), now);
    return "failed";
  }
};

const processPeriod = async (
  schedule: RecurringSchedule,
  periodKey: string,
  workerId: string,
  now: Date,
): Promise<OccurrenceOutcome> => {
  const organizationId = schedule.organizationId;

  // Atomic claim: exactly one worker wins; losers inspect the existing row.
  const { claimed, occurrence } = await occurrenceRepository.claimPeriod(
    organizationId,
    schedule.id,
    periodKey,
    workerId,
  );

  if (claimed && occurrence) {
    return await processClaimedOccurrence(schedule, occurrence.id, periodKey, now);
  }

  if (!occurrence) {
    return "skipped";
  }

  // Recovery paths for a row owned by someone else.
  if (occurrence.status === "Succeeded") {
    return "skipped";
  }
  if (occurrence.status === "Failed") {
    return "skipped";
  }
  if (occurrence.status === "Processing") {
    if (!isStaleClaim(occurrence.claimedAt, now)) {
      return "skipped";
    }
    // Stale claim: if an invoice was persisted for this period, adopt it
    // (exactly-once recovery); otherwise release the claim for retry.
    const linked = await occurrenceRepository.findInvoiceForPeriod(schedule.id, periodKey);
    if (linked) {
      const prisma = getPrisma();
      const nextRunDate = advanceRecurrence({
        frequency: schedule.frequency,
        fromDate: periodKey,
        anchorDay: anchorDayOf(schedule.startDate),
      });
      const completed = Boolean(schedule.endDate && isAfter(nextRunDate, schedule.endDate));
      await prisma.$transaction(async (tx) => {
        await occurrenceRepository.markSucceeded(organizationId, occurrence.id, linked.id, tx);
        await recurringScheduleRepository.updateProgress(
          organizationId,
          schedule.id,
          {
            nextRunDate,
            status: completed ? "Completed" : undefined,
            successCount: schedule.successCount + 1,
            consecutiveFailures: 0,
            lastRunAt: now,
            lastResult: `Recovered invoice ${linked.invoiceNumber} for ${periodKey}.`,
          },
          tx,
        );
      });
      return "succeeded";
    }
    await occurrenceRepository.resetToPending(organizationId, occurrence.id);
    const retried = await occurrenceRepository.markProcessing(organizationId, occurrence.id, workerId);
    if (!retried) {
      return "skipped";
    }
    return await processClaimedOccurrence(schedule, occurrence.id, periodKey, now);
  }

  // Pending row owned by nobody (e.g. after a reset): conditional claim.
  const won = await occurrenceRepository.markProcessing(organizationId, occurrence.id, workerId);
  if (!won) {
    return "skipped";
  }
  return await processClaimedOccurrence(schedule, occurrence.id, periodKey, now);
};

const processOneSchedule = async (
  schedule: RecurringSchedule,
  now: Date,
  workerId: string,
  summary: SchedulerRunSummary,
  maxPeriods: number,
): Promise<void> => {
  const today = todayInTimezone(schedule.timezone, now);
  const anchorDay = anchorDayOf(schedule.startDate);
  const periods = collectDuePeriods({
    frequency: schedule.frequency,
    anchorDay,
    nextRunDate: schedule.nextRunDate,
    endDate: schedule.endDate,
    today,
    maxPeriods,
  });

  if (periods.length === 0) {
    // Advance past an end date without generating: mark completed.
    if (
      schedule.endDate &&
      isAfter(schedule.nextRunDate, schedule.endDate) &&
      schedule.status === "Active"
    ) {
      await recurringScheduleRepository.updateProgress(organizationIdOf(schedule), schedule.id, {
        status: "Completed",
        lastResult: "Schedule completed: next run date passed the end date.",
      });
    }
    summary.skipped += 1;
    return;
  }

  let current = schedule;
  for (const period of periods) {
    // Re-read inside the loop: a concurrent edit or earlier period may have
    // paused, completed, or advanced the schedule.
    const fresh = await recurringScheduleRepository.findById(current.organizationId, current.id);
    if (!fresh || fresh.status !== "Active") {
      summary.skipped += 1;
      return;
    }
    if (fresh.nextRunDate > period) {
      continue;
    }
    current = fresh;
    const outcome = await processPeriod(current, period, workerId, now);
    summary.occurrencesProcessed += 1;
    if (outcome === "succeeded") {
      summary.succeeded += 1;
    } else if (outcome === "failed") {
      summary.failed += 1;
    } else {
      summary.skipped += 1;
    }
    // Refresh counters/status for the next period in this run.
    const reloaded = await recurringScheduleRepository.findById(current.organizationId, current.id);
    if (!reloaded || reloaded.status !== "Active") {
      return;
    }
    current = reloaded;
  }
};

const organizationIdOf = (schedule: RecurringSchedule): string => schedule.organizationId;

/**
 * Processes all due recurring schedules across organizations.
 * Each schedule is handled in its own organization scope with isolated
 * error handling: one schedule's failure never aborts the run.
 */
export const processDueSchedules = async (
  options: ProcessSchedulesOptions = {},
): Promise<SchedulerRunSummary> => {
  const summary = emptySummary();
  const now = options.now ?? new Date();
  const workerId = options.workerId ?? `worker_${crypto.randomUUID()}`;
  const limit = options.limit ?? MAX_SCHEDULES_PER_RUN;

  const schedules = await recurringScheduleRepository.findActiveSchedules(limit);
  for (const schedule of schedules) {
    summary.schedulesChecked += 1;
    try {
      await processOneSchedule(
        schedule,
        now,
        workerId,
        summary,
        MAX_OCCURRENCES_PER_SCHEDULE_RUN,
      );
    } catch (err: unknown) {
      summary.failed += 1;
      try {
        await recurringScheduleRepository.updateProgress(
          schedule.organizationId,
          schedule.id,
          { lastResult: sanitizeFailure(err), lastRunAt: now },
        );
      } catch {
        // Diagnostics are best-effort; the run summary stays authoritative.
      }
    }
  }

  return summary;
};

/**
 * Manually processes due periods for a single schedule within the caller's
 * organization. Same idempotent processor as the scheduler; safe to retry.
 */
export const processScheduleNow = async (
  organizationId: string,
  scheduleId: string,
  options: { now?: Date; workerId?: string } = {},
): Promise<SchedulerRunSummary> => {
  const summary = emptySummary();
  const schedule = await recurringScheduleRepository.findById(organizationId, scheduleId);
  if (!schedule || schedule.status !== "Active") {
    return summary;
  }
  summary.schedulesChecked += 1;
  await processOneSchedule(
    schedule,
    options.now ?? new Date(),
    options.workerId ?? `manual_${crypto.randomUUID()}`,
    summary,
    MAX_OCCURRENCES_PER_SCHEDULE_RUN,
  );
  try {
    revalidatePath("/recurring-invoices");
    revalidatePath(`/recurring-invoices/${scheduleId}`);
    revalidatePath("/invoices");
  } catch {
    // Revalidation is best-effort outside request contexts (e.g. cron).
  }
  return summary;
};
