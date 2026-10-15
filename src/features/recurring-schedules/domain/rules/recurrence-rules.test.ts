import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsClamped,
  advanceRecurrence,
  anchorDayOf,
  collectDuePeriods,
  daysInMonth,
  formatDateParts,
  isAfter,
  isOnOrBefore,
  isValidTimezone,
  parseDateParts,
  todayInTimezone,
} from "./recurrence-rules";

describe("calendar parsing", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(parseDateParts("2026-10-15")).toEqual({ year: 2026, month: 10, day: 15 });
    expect(parseDateParts("2026-02-30")).toBeNull();
    expect(parseDateParts("2026-13-01")).toBeNull();
    expect(parseDateParts("15/10/2026")).toBeNull();
    expect(parseDateParts("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseDateParts("2025-02-29")).toBeNull();
  });

  it("formats parts back to ISO", () => {
    expect(formatDateParts({ year: 2026, month: 1, day: 5 })).toBe("2026-01-05");
  });

  it("reports month lengths including leap February", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2025, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
});

describe("weekly recurrence", () => {
  it("adds exactly 7 days across month and year boundaries", () => {
    expect(addDays("2026-01-28", 7)).toBe("2026-02-04");
    expect(addDays("2026-12-29", 7)).toBe("2027-01-05");
    expect(advanceRecurrence({ frequency: "Weekly", fromDate: "2026-10-14", anchorDay: 14 })).toBe(
      "2026-10-21",
    );
  });
});

describe("monthly recurrence with anchor preservation", () => {
  it("keeps the same day for full months", () => {
    expect(addMonthsClamped("2026-01-15", 1, 15)).toBe("2026-02-15");
    expect(advanceRecurrence({ frequency: "Monthly", fromDate: "2026-01-15", anchorDay: 15 })).toBe(
      "2026-02-15",
    );
  });

  it("clamps short months without moving the anchor", () => {
    expect(addMonthsClamped("2026-01-31", 1, 31)).toBe("2026-02-28");
    // Anchor preserved: March returns to the 31st.
    expect(addMonthsClamped("2026-02-28", 1, 31)).toBe("2026-03-31");
    expect(addMonthsClamped("2026-04-30", 1, 30)).toBe("2026-05-30");
  });

  it("handles leap-year February anchors", () => {
    expect(addMonthsClamped("2024-01-29", 1, 29)).toBe("2024-02-29");
    expect(addMonthsClamped("2025-01-29", 1, 29)).toBe("2025-02-28");
    expect(addMonthsClamped("2023-02-28", 12, 29)).toBe("2024-02-29");
  });

  it("derives the anchor from the start date", () => {
    expect(anchorDayOf("2026-01-31")).toBe(31);
    expect(anchorDayOf("invalid")).toBe(1);
  });
});

describe("quarterly and yearly recurrence", () => {
  it("advances three and twelve months with clamping", () => {
    expect(
      advanceRecurrence({ frequency: "Quarterly", fromDate: "2026-11-30", anchorDay: 30 }),
    ).toBe("2027-02-28");
    expect(
      advanceRecurrence({ frequency: "Yearly", fromDate: "2024-02-29", anchorDay: 29 }),
    ).toBe("2025-02-28");
    expect(
      advanceRecurrence({ frequency: "Yearly", fromDate: "2025-02-28", anchorDay: 29 }),
    ).toBe("2026-02-28");
  });
});

describe("due-period collection (missed-run policy)", () => {
  it("collects every missed period up to the bound", () => {
    expect(
      collectDuePeriods({
        frequency: "Weekly",
        anchorDay: 1,
        nextRunDate: "2026-10-01",
        today: "2026-10-22",
        maxPeriods: 10,
      }),
    ).toEqual(["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22"]);
  });

  it("caps collection at maxPeriods", () => {
    expect(
      collectDuePeriods({
        frequency: "Weekly",
        anchorDay: 1,
        nextRunDate: "2026-01-01",
        today: "2026-12-31",
        maxPeriods: 3,
      }),
    ).toHaveLength(3);
  });

  it("never collects periods past the end date", () => {
    expect(
      collectDuePeriods({
        frequency: "Monthly",
        anchorDay: 15,
        nextRunDate: "2026-10-15",
        endDate: "2026-11-15",
        today: "2027-01-15",
        maxPeriods: 10,
      }),
    ).toEqual(["2026-10-15", "2026-11-15"]);
  });

  it("returns nothing when nothing is due", () => {
    expect(
      collectDuePeriods({
        frequency: "Monthly",
        anchorDay: 15,
        nextRunDate: "2026-12-15",
        today: "2026-10-15",
        maxPeriods: 10,
      }),
    ).toEqual([]);
  });

  it("rejects an invalid cursor instead of looping", () => {
    expect(
      collectDuePeriods({
        frequency: "Monthly",
        anchorDay: 15,
        nextRunDate: "not-a-date",
        today: "2026-10-15",
        maxPeriods: 10,
      }),
    ).toEqual([]);
  });
});

describe("timezone handling", () => {
  it("computes today in the schedule zone", () => {
    const utcMidnight = new Date("2026-10-15T00:30:00.000Z");
    expect(todayInTimezone("Asia/Kolkata", utcMidnight)).toBe("2026-10-15");
    expect(todayInTimezone("America/New_York", utcMidnight)).toBe("2026-10-14");
    expect(todayInTimezone("UTC", utcMidnight)).toBe("2026-10-15");
  });

  it("validates IANA timezone names", () => {
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });

  it("compares ISO dates lexicographically", () => {
    expect(isOnOrBefore("2026-10-15", "2026-10-15")).toBe(true);
    expect(isOnOrBefore("2026-10-16", "2026-10-15")).toBe(false);
    expect(isAfter("2026-10-16", "2026-10-15")).toBe(true);
  });
});
