"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveRecurringScheduleContext } from "../context/recurring-schedule-context";
import { occurrenceRepository } from "../../infrastructure/repositories/prisma-recurring-repository";
import { processScheduleNow } from "./run-recurring-scheduler";
import type {
  RecurringActionResult,
  SchedulerRunSummary,
} from "../dto/recurring-schedule-dto";
import {
  UnauthorizedRecurringAccessError,
} from "../../domain/errors/recurring-errors";

/**
 * Manually triggers due-period processing for one schedule within the
 * caller's organization. Runs the same idempotent processor as the
 * scheduler, so repeats and races with scheduled execution are safe.
 * Owner/admin only: generation issues real invoices.
 */
export const triggerRecurringScheduleAction = async (
  id: string,
): Promise<RecurringActionResult<SchedulerRunSummary>> => {
  try {
    const { organizationId, memberRole, userId } = await resolveRecurringScheduleContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedRecurringAccessError(
        "Only organization owners or admins can trigger scheduled billing.",
      );
    }

    const summary = await processScheduleNow(organizationId, id, {
      workerId: `manual_${userId}`,
    });

    try {
      revalidatePath("/recurring-invoices");
      revalidatePath(`/recurring-invoices/${id}`);
      revalidatePath("/invoices");
    } catch {
      // Best-effort outside request contexts.
    }

    return { success: true, data: summary };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};

/**
 * Resets a failed occurrence to pending so the next processor run retries
 * the same billing period. The period identity is preserved: a retry can
 * never bill a different period or duplicate a succeeded one.
 */
export const retryRecurringOccurrenceAction = async (
  occurrenceId: string,
): Promise<RecurringActionResult<{ id: string }>> => {
  try {
    const { organizationId, memberRole } = await resolveRecurringScheduleContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedRecurringAccessError(
        "Only organization owners or admins can retry scheduled billing.",
      );
    }

    const existing = await occurrenceRepository.findById(organizationId, occurrenceId);
    if (!existing) {
      return { success: false, error: "Occurrence was not found in your organization." };
    }
    if (existing.status !== "Failed") {
      return {
        success: false,
        error: `Only failed occurrences can be retried (current status: ${existing.status}).`,
      };
    }

    await occurrenceRepository.resetToPending(organizationId, occurrenceId);

    try {
      revalidatePath("/recurring-invoices");
    } catch {
      // Best-effort.
    }

    return { success: true, data: { id: occurrenceId } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
