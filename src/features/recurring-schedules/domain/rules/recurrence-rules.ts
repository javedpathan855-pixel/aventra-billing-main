import type { RecurringFrequency } from "../recurring-schedule";

/**
 * Calendar-aware recurrence rules.
 *
 * - Weekly adds exactly 7 days; monthly/quarterly/yearly add calendar months
 *   (never fixed 30/365-day arithmetic).
 * - The anchor day-of-month comes from the schedule start date and is
 *   preserved across advances; months shorter than the anchor clamp to their
 *   last day WITHOUT moving the anchor (Jan 31 → Feb 28 → Mar 31).
 * - Feb 29 anchors land on Feb 28 in non-leap years and Feb 29 in leap years.
 * - All math is date-only (YYYY-MM-DD); timezone affects only which calendar
 *   day "today" is in the schedule's zone. DST therefore cannot shift a
 *   billing period.
 */
export type DateParts = { year: number; month: number; day: number };

export const parseDateParts = (value: string): DateParts | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Round-trip through UTC to reject impossible dates (e.g. 2026-02-30).
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
};

export const formatDateParts = ({ year, month, day }: DateParts): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

export const anchorDayOf = (startDate: string): number => {
  const parts = parseDateParts(startDate);
  return parts ? parts.day : 1;
};

export const addMonthsClamped = (
  fromDate: string,
  months: number,
  anchorDay: number,
): string => {
  const parts = parseDateParts(fromDate);
  if (!parts) return fromDate;
  const totalMonths = (parts.year * 12 + (parts.month - 1)) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(Math.max(1, anchorDay), daysInMonth(year, month));
  return formatDateParts({ year, month, day });
};

export const addDays = (fromDate: string, days: number): string => {
  const parts = parseDateParts(fromDate);
  if (!parts) return fromDate;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatDateParts({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
};

export const advanceRecurrence = ({
  frequency,
  fromDate,
  anchorDay,
}: {
  frequency: RecurringFrequency;
  fromDate: string;
  anchorDay: number;
}): string => {
  switch (frequency) {
    case "Weekly":
      return addDays(fromDate, 7);
    case "Monthly":
      return addMonthsClamped(fromDate, 1, anchorDay);
    case "Quarterly":
      return addMonthsClamped(fromDate, 3, anchorDay);
    case "Yearly":
      return addMonthsClamped(fromDate, 12, anchorDay);
  }
};

/** ISO dates compare lexicographically — safe for YYYY-MM-DD. */
export const isOnOrBefore = (a: string, b: string): boolean => a <= b;
export const isAfter = (a: string, b: string): boolean => a > b;

/**
 * Today's calendar date in the schedule's timezone, as YYYY-MM-DD.
 * Falls back to UTC for unknown zones (callers validate zones at the edge).
 */
export const todayInTimezone = (timezone: string, now: Date = new Date()): string => {
  try {
    const formatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return parseDateParts(formatted) ? formatted : now.toISOString().slice(0, 10);
  } catch {
    return now.toISOString().slice(0, 10);
  }
};

export const isValidTimezone = (timezone: string): boolean => {
  if (!timezone || timezone.trim().length === 0 || timezone.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Missed-run policy (documented): collect every missed period from
 * nextRunDate through today (bounded by `maxPeriods`), skipping dates past
 * endDate. Each collected period becomes its own idempotent occurrence, so a
 * long outage backfills as separate invoices instead of silently dropping
 * billing periods. The per-run bound keeps a single execution finite; the
 * remainder is picked up on the next run.
 */
export const collectDuePeriods = ({
  frequency,
  anchorDay,
  nextRunDate,
  endDate,
  today,
  maxPeriods,
}: {
  frequency: RecurringFrequency;
  anchorDay: number;
  nextRunDate: string;
  endDate?: string;
  today: string;
  maxPeriods: number;
}): string[] => {
  const periods: string[] = [];
  let cursor = nextRunDate;
  let guard = 0;
  while (
    periods.length < maxPeriods &&
    guard < maxPeriods + 1 &&
    isOnOrBefore(cursor, today) &&
    parseDateParts(cursor) !== null
  ) {
    guard += 1;
    if (!endDate || isOnOrBefore(cursor, endDate)) {
      periods.push(cursor);
    }
    const next = advanceRecurrence({ frequency, fromDate: cursor, anchorDay });
    if (next <= cursor) break;
    cursor = next;
  }
  return periods;
};
