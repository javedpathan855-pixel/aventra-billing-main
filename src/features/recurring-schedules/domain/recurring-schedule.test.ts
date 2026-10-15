import { describe, expect, it } from "vitest";
import {
  canCompleteSchedule,
  canEditSchedule,
  canPauseSchedule,
  canResumeSchedule,
  isTerminalScheduleStatus,
  validateRecurringLineItems,
} from "./recurring-schedule";

describe("schedule lifecycle guards", () => {
  it("allows editing only while Active or Paused", () => {
    expect(canEditSchedule("Active")).toBe(true);
    expect(canEditSchedule("Paused")).toBe(true);
    expect(canEditSchedule("Completed")).toBe(false);
    expect(canEditSchedule("Cancelled")).toBe(false);
  });

  it("allows pause from Active and resume from Paused only", () => {
    expect(canPauseSchedule("Active")).toBe(true);
    expect(canPauseSchedule("Paused")).toBe(false);
    expect(canResumeSchedule("Paused")).toBe(true);
    expect(canResumeSchedule("Active")).toBe(false);
    expect(canResumeSchedule("Completed")).toBe(false);
  });

  it("allows completion from Active or Paused and marks terminal states", () => {
    expect(canCompleteSchedule("Active")).toBe(true);
    expect(canCompleteSchedule("Paused")).toBe(true);
    expect(canCompleteSchedule("Completed")).toBe(false);
    expect(isTerminalScheduleStatus("Completed")).toBe(true);
    expect(isTerminalScheduleStatus("Cancelled")).toBe(true);
    expect(isTerminalScheduleStatus("Active")).toBe(false);
  });
});

describe("schedule line validation", () => {
  it("requires at least one line and valid amounts", () => {
    expect(validateRecurringLineItems([]).items).toBeTruthy();
    const errors = validateRecurringLineItems([
      {
        id: "l-1",
        item: "",
        description: "",
        quantity: 0,
        unitPrice: -1,
        discount: 101,
        taxRate: 101,
      },
    ]);
    expect(errors["item-0"]).toBeTruthy();
    expect(errors["quantity-0"]).toBeTruthy();
    expect(errors["price-0"]).toBeTruthy();
    expect(errors["discount-0"]).toBeTruthy();
    expect(errors["tax-0"]).toBeTruthy();
  });

  it("accepts valid lines", () => {
    expect(
      validateRecurringLineItems([
        {
          id: "l-1",
          item: "Retainer",
          description: "",
          quantity: 1,
          unitPrice: 50000,
          discount: 0,
          taxRate: 18,
        },
      ]),
    ).toEqual({});
  });
});
