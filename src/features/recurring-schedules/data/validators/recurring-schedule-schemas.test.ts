import { describe, expect, it } from "vitest";
import {
  createRecurringScheduleSchema,
  recurringLineItemSchema,
  updateRecurringScheduleSchema,
} from "./recurring-schedule-schemas";

const baseValid = {
  name: "Acme monthly retainer",
  customerName: "Acme Corp",
  frequency: "Monthly",
  startDate: "2026-10-15",
  items: [{ item: "Retainer", quantity: 1, unitPrice: 50000 }],
};

describe("recurring schedule schemas", () => {
  it("validates a correct payload with timezone and payment defaults", () => {
    const result = createRecurringScheduleSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe("Asia/Kolkata");
      expect(result.data.paymentTerms).toBe("Net 15 days");
    }
  });

  it("rejects impossible calendar dates", () => {
    expect(
      createRecurringScheduleSchema.safeParse({ ...baseValid, startDate: "2026-02-30" }).success,
    ).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    expect(
      createRecurringScheduleSchema.safeParse({
        ...baseValid,
        startDate: "2026-10-15",
        endDate: "2026-09-15",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid timezones and percentage discounts over 100", () => {
    expect(
      createRecurringScheduleSchema.safeParse({ ...baseValid, timezone: "Mars/Olympus" }).success,
    ).toBe(false);
    expect(
      createRecurringScheduleSchema.safeParse({
        ...baseValid,
        additionalDiscount: 120,
        additionalDiscountType: "percentage",
      }).success,
    ).toBe(false);
  });

  it("coerces numeric strings and rejects non-finite line values", () => {
    const coerced = recurringLineItemSchema.safeParse({
      item: "Service",
      quantity: "2",
      unitPrice: "1500.50",
    });
    expect(coerced.success).toBe(true);
    expect(
      recurringLineItemSchema.safeParse({ item: "X", quantity: 1, unitPrice: Infinity }).success,
    ).toBe(false);
  });

  it("requires id on update", () => {
    expect(
      updateRecurringScheduleSchema.safeParse({ ...baseValid, id: "" }).success,
    ).toBe(false);
    expect(
      updateRecurringScheduleSchema.safeParse({ ...baseValid, id: "rsch-1" }).success,
    ).toBe(true);
  });
});
