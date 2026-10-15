import type {
  RecurringSchedule,
  RecurringScheduleStatus,
} from "../recurring-schedule";

export type RecurringScheduleFilterOptions = {
  query?: string;
  status?: RecurringScheduleStatus | "All";
  frequency?: RecurringSchedule["frequency"] | "All";
  customer?: string;
  sortBy?: "nextRunDate-asc" | "nextRunDate-desc" | "name-asc" | "created-desc";
};

export const filterSchedules = (
  schedules: RecurringSchedule[],
  options: RecurringScheduleFilterOptions = {},
): RecurringSchedule[] => {
  const normalized = (options.query ?? "").trim().toLowerCase();
  const targetStatus = options.status ?? "All";
  const targetFrequency = options.frequency ?? "All";
  const targetCustomer =
    options.customer && options.customer !== "All"
      ? options.customer.toLowerCase()
      : "";
  const sortBy = options.sortBy ?? "nextRunDate-asc";

  const filtered = schedules.filter((schedule) => {
    if (normalized) {
      const matchName = schedule.customerName.toLowerCase().includes(normalized);
      const matchSchedule = schedule.name.toLowerCase().includes(normalized);
      if (!matchName && !matchSchedule) {
        return false;
      }
    }
    if (targetStatus !== "All" && schedule.status !== targetStatus) {
      return false;
    }
    if (targetFrequency !== "All" && schedule.frequency !== targetFrequency) {
      return false;
    }
    if (targetCustomer && schedule.customerName.toLowerCase() !== targetCustomer) {
      return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    switch (sortBy) {
      case "nextRunDate-desc":
        return b.nextRunDate.localeCompare(a.nextRunDate);
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "created-desc":
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      case "nextRunDate-asc":
      default:
        return a.nextRunDate.localeCompare(b.nextRunDate);
    }
  });
};

export type RecurringScheduleSummary = {
  totalSchedules: number;
  activeCount: number;
  pausedCount: number;
  completedCount: number;
  invoicesGenerated: number;
};

export const summarizeSchedules = (
  schedules: readonly RecurringSchedule[],
): RecurringScheduleSummary =>
  schedules.reduce<RecurringScheduleSummary>(
    (summary, schedule) => {
      summary.totalSchedules += 1;
      if (schedule.status === "Active") {
        summary.activeCount += 1;
      } else if (schedule.status === "Paused") {
        summary.pausedCount += 1;
      } else {
        summary.completedCount += 1;
      }
      summary.invoicesGenerated += schedule.successCount;
      return summary;
    },
    {
      totalSchedules: 0,
      activeCount: 0,
      pausedCount: 0,
      completedCount: 0,
      invoicesGenerated: 0,
    },
  );
