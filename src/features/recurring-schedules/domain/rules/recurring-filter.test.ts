import { describe, expect, it } from "vitest";
import { filterSchedules, summarizeSchedules } from "./recurring-filter";
import type { RecurringSchedule } from "../recurring-schedule";

const schedule = (overrides: Partial<RecurringSchedule> = {}): RecurringSchedule => ({
  id: "rsch-1",
  organizationId: "org-1",
  name: "Acme retainer",
  customerName: "Acme",
  customerEmail: "",
  customerAddress: "",
  customerGstin: "",
  frequency: "Monthly",
  startDate: "2026-01-15",
  nextRunDate: "2026-10-15",
  timezone: "Asia/Kolkata",
  status: "Active",
  paymentTerms: "Net 15 days",
  additionalCharges: 0,
  additionalDiscount: 0,
  additionalDiscountType: "fixed",
  notes: "",
  terms: "",
  items: [],
  successCount: 3,
  failureCount: 0,
  consecutiveFailures: 0,
  ...overrides,
});

describe("filterSchedules", () => {
  const schedules = [
    schedule({ id: "a", name: "Acme retainer", status: "Active", frequency: "Monthly" }),
    schedule({ id: "b", name: "Beta weekly", customerName: "Beta", status: "Paused", frequency: "Weekly" }),
    schedule({ id: "c", name: "Gamma yearly", customerName: "Gamma", status: "Completed", frequency: "Yearly" }),
  ];

  it("filters by query, status, frequency, and customer", () => {
    expect(filterSchedules(schedules, { query: "beta" }).map((s) => s.id)).toEqual(["b"]);
    expect(filterSchedules(schedules, { status: "Active" }).map((s) => s.id)).toEqual(["a"]);
    expect(filterSchedules(schedules, { frequency: "Yearly" }).map((s) => s.id)).toEqual(["c"]);
    expect(filterSchedules(schedules, { customer: "acme" }).map((s) => s.id)).toEqual(["a"]);
  });

  it("sorts by next run date and name", () => {
    const withDates = [
      schedule({ id: "a", nextRunDate: "2026-11-15" }),
      schedule({ id: "b", nextRunDate: "2026-10-15" }),
    ];
    expect(filterSchedules(withDates, { sortBy: "nextRunDate-asc" }).map((s) => s.id)).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("summarizeSchedules", () => {
  it("counts statuses and generated invoices", () => {
    const summary = summarizeSchedules([
      schedule({ status: "Active", successCount: 3 }),
      schedule({ id: "b", status: "Paused", successCount: 0 }),
      schedule({ id: "c", status: "Completed", successCount: 12 }),
    ]);
    expect(summary.totalSchedules).toBe(3);
    expect(summary.activeCount).toBe(1);
    expect(summary.pausedCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.invoicesGenerated).toBe(15);
  });
});
