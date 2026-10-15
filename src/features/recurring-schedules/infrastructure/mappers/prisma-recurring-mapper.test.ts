import { describe, expect, it } from "vitest";
import {
  RecurringFrequency as PrismaFrequency,
  RecurringOccurrenceStatus as PrismaOccurrenceStatus,
  RecurringScheduleStatus as PrismaScheduleStatus,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import {
  toDomainFrequency,
  toDomainOccurrence,
  toDomainSchedule,
  toPrismaFrequency,
  toPrismaScheduleStatus,
} from "./prisma-recurring-mapper";

const Decimal = Prisma.Decimal;

describe("prisma-recurring-mapper", () => {
  it("maps frequencies and statuses both directions", () => {
    expect(toDomainFrequency(PrismaFrequency.MONTHLY)).toBe("Monthly");
    expect(toPrismaFrequency("Quarterly")).toBe(PrismaFrequency.QUARTERLY);
    expect(toPrismaScheduleStatus("Active")).toBe(PrismaScheduleStatus.ACTIVE);
  });

  it("maps a schedule record with items to the domain entity", () => {
    const record = {
      id: "rsch-1",
      organizationId: "org-1",
      name: "Acme retainer",
      customerId: "cust-1",
      customerName: "Acme",
      customerEmail: null,
      customerAddress: null,
      customerGstin: null,
      customerPlaceOfSupply: null,
      frequency: PrismaFrequency.MONTHLY,
      startDate: new Date("2026-01-15T00:00:00.000Z"),
      endDate: null,
      nextRunDate: new Date("2026-10-15T00:00:00.000Z"),
      timezone: "Asia/Kolkata",
      status: PrismaScheduleStatus.ACTIVE,
      paymentTerms: "Net 15 days",
      additionalCharges: new Decimal(0),
      additionalChargesLabel: null,
      additionalDiscount: new Decimal(0),
      additionalDiscountType: "fixed",
      additionalDiscountLabel: null,
      notes: null,
      terms: null,
      successCount: 2,
      failureCount: 0,
      consecutiveFailures: 0,
      lastRunAt: null,
      lastResult: null,
      createdBy: "user-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      items: [
        {
          id: "ritem-1",
          scheduleId: "rsch-1",
          productId: null,
          item: "Retainer",
          description: null,
          hsnSac: null,
          quantity: new Decimal(1),
          unitPrice: new Decimal(50000),
          discount: new Decimal(0),
          taxRate: new Decimal(18),
          sortOrder: 0,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    };

    const domain = toDomainSchedule(record as Parameters<typeof toDomainSchedule>[0]);
    expect(domain.frequency).toBe("Monthly");
    expect(domain.startDate).toBe("2026-01-15");
    expect(domain.nextRunDate).toBe("2026-10-15");
    expect(domain.items).toHaveLength(1);
    expect(domain.items[0].unitPrice).toBe(50000);
    expect(domain.successCount).toBe(2);
  });

  it("maps an occurrence record with invoice linkage", () => {
    const record = {
      id: "occ-1",
      organizationId: "org-1",
      scheduleId: "rsch-1",
      periodKey: "2026-10-15",
      status: PrismaOccurrenceStatus.SUCCEEDED,
      attempts: 1,
      claimedAt: null,
      claimedBy: null,
      invoiceId: "inv-1",
      error: null,
      createdAt: new Date("2026-10-15T00:00:00.000Z"),
      updatedAt: new Date("2026-10-15T00:00:00.000Z"),
      invoice: { invoiceNumber: "INV-0001" },
    };

    const domain = toDomainOccurrence(record as Parameters<typeof toDomainOccurrence>[0]);
    expect(domain.status).toBe("Succeeded");
    expect(domain.invoiceId).toBe("inv-1");
    expect(domain.invoiceNumber).toBe("INV-0001");
  });
});
