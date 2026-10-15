import "server-only";

import { resolveRecurringScheduleContext } from "../context/recurring-schedule-context";
import {
  occurrenceRepository,
  recurringScheduleRepository,
} from "../../infrastructure/repositories/prisma-recurring-repository";
import type {
  RecurringOccurrence,
  RecurringSchedule,
} from "../../domain/recurring-schedule";
import type { RecurringScheduleFilterCriteria } from "../../domain/repositories/recurring-schedule-repository";

export const getRecurringSchedules = async (
  criteria?: RecurringScheduleFilterCriteria,
): Promise<{ schedules: RecurringSchedule[] }> => {
  const { organizationId } = await resolveRecurringScheduleContext();
  const schedules = await recurringScheduleRepository.findMany(organizationId, criteria);
  return { schedules };
};

export type RecurringScheduleDetail = {
  schedule: RecurringSchedule;
  occurrences: RecurringOccurrence[];
};

export const getRecurringScheduleById = async (
  id: string,
): Promise<RecurringScheduleDetail | null> => {
  const { organizationId } = await resolveRecurringScheduleContext();
  const schedule = await recurringScheduleRepository.findById(organizationId, id);
  if (!schedule) {
    return null;
  }
  const occurrences = await occurrenceRepository.findBySchedule(organizationId, id);
  return { schedule, occurrences };
};
