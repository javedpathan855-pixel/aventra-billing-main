import {
  RecurringFrequency as PrismaRecurringFrequency,
  RecurringOccurrenceStatus as PrismaRecurringOccurrenceStatus,
  RecurringScheduleStatus as PrismaRecurringScheduleStatus,
} from "@/generated/prisma/enums";
import type {
  RecurringOccurrence as PrismaRecurringOccurrence,
  RecurringSchedule as PrismaRecurringSchedule,
  RecurringScheduleItem as PrismaRecurringScheduleItem,
} from "@/generated/prisma/client";
import type {
  RecurringFrequency,
  RecurringOccurrence,
  RecurringOccurrenceStatus,
  RecurringSchedule,
  RecurringScheduleLineItem,
  RecurringScheduleStatus,
} from "../../domain/recurring-schedule";

export type PrismaScheduleWithRelations = PrismaRecurringSchedule & {
  items: PrismaRecurringScheduleItem[];
};

export type PrismaOccurrenceWithInvoice = PrismaRecurringOccurrence & {
  invoice?: { invoiceNumber: string } | null;
};

export const toDomainFrequency = (frequency: PrismaRecurringFrequency): RecurringFrequency => {
  switch (frequency) {
    case PrismaRecurringFrequency.WEEKLY:
      return "Weekly";
    case PrismaRecurringFrequency.MONTHLY:
      return "Monthly";
    case PrismaRecurringFrequency.QUARTERLY:
      return "Quarterly";
    case PrismaRecurringFrequency.YEARLY:
      return "Yearly";
    default:
      return "Monthly";
  }
};

export const toPrismaFrequency = (frequency: RecurringFrequency): PrismaRecurringFrequency => {
  switch (frequency) {
    case "Weekly":
      return PrismaRecurringFrequency.WEEKLY;
    case "Monthly":
      return PrismaRecurringFrequency.MONTHLY;
    case "Quarterly":
      return PrismaRecurringFrequency.QUARTERLY;
    case "Yearly":
      return PrismaRecurringFrequency.YEARLY;
    default:
      return PrismaRecurringFrequency.MONTHLY;
  }
};

export const toDomainScheduleStatus = (
  status: PrismaRecurringScheduleStatus,
): RecurringScheduleStatus => {
  switch (status) {
    case PrismaRecurringScheduleStatus.ACTIVE:
      return "Active";
    case PrismaRecurringScheduleStatus.PAUSED:
      return "Paused";
    case PrismaRecurringScheduleStatus.COMPLETED:
      return "Completed";
    case PrismaRecurringScheduleStatus.CANCELLED:
      return "Cancelled";
    default:
      return "Paused";
  }
};

export const toPrismaScheduleStatus = (
  status: RecurringScheduleStatus,
): PrismaRecurringScheduleStatus => {
  switch (status) {
    case "Active":
      return PrismaRecurringScheduleStatus.ACTIVE;
    case "Paused":
      return PrismaRecurringScheduleStatus.PAUSED;
    case "Completed":
      return PrismaRecurringScheduleStatus.COMPLETED;
    case "Cancelled":
      return PrismaRecurringScheduleStatus.CANCELLED;
    default:
      return PrismaRecurringScheduleStatus.PAUSED;
  }
};

export const toDomainOccurrenceStatus = (
  status: PrismaRecurringOccurrenceStatus,
): RecurringOccurrenceStatus => {
  switch (status) {
    case PrismaRecurringOccurrenceStatus.PENDING:
      return "Pending";
    case PrismaRecurringOccurrenceStatus.PROCESSING:
      return "Processing";
    case PrismaRecurringOccurrenceStatus.SUCCEEDED:
      return "Succeeded";
    case PrismaRecurringOccurrenceStatus.FAILED:
      return "Failed";
    default:
      return "Pending";
  }
};

export const toPrismaOccurrenceStatus = (
  status: RecurringOccurrenceStatus,
): PrismaRecurringOccurrenceStatus => {
  switch (status) {
    case "Pending":
      return PrismaRecurringOccurrenceStatus.PENDING;
    case "Processing":
      return PrismaRecurringOccurrenceStatus.PROCESSING;
    case "Succeeded":
      return PrismaRecurringOccurrenceStatus.SUCCEEDED;
    case "Failed":
      return PrismaRecurringOccurrenceStatus.FAILED;
    default:
      return PrismaRecurringOccurrenceStatus.PENDING;
  }
};

const toIsoDate = (value: Date): string => value.toISOString().split("T")[0] ?? "";

export const toDomainScheduleLineItem = (
  item: PrismaRecurringScheduleItem,
): RecurringScheduleLineItem => ({
  id: item.id,
  productId: item.productId ?? undefined,
  item: item.item,
  description: item.description ?? "",
  hsnSac: item.hsnSac ?? undefined,
  quantity: Number(item.quantity),
  unitPrice: Number(item.unitPrice),
  discount: Number(item.discount),
  taxRate: Number(item.taxRate),
});

export const toDomainSchedule = (record: PrismaScheduleWithRelations): RecurringSchedule => {
  const sortedItems = [...record.items].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    customerId: record.customerId ?? undefined,
    customerName: record.customerName,
    customerEmail: record.customerEmail ?? "",
    customerAddress: record.customerAddress ?? "",
    customerGstin: record.customerGstin ?? "",
    customerPlaceOfSupply: record.customerPlaceOfSupply ?? undefined,
    frequency: toDomainFrequency(record.frequency),
    startDate: toIsoDate(record.startDate),
    endDate: record.endDate ? toIsoDate(record.endDate) : undefined,
    nextRunDate: toIsoDate(record.nextRunDate),
    timezone: record.timezone,
    status: toDomainScheduleStatus(record.status),
    paymentTerms: record.paymentTerms,
    additionalCharges: Number(record.additionalCharges),
    additionalChargesLabel: record.additionalChargesLabel ?? undefined,
    additionalDiscount: Number(record.additionalDiscount),
    additionalDiscountType: (record.additionalDiscountType === "percentage"
      ? "percentage"
      : "fixed") as "percentage" | "fixed",
    additionalDiscountLabel: record.additionalDiscountLabel ?? undefined,
    notes: record.notes ?? "",
    terms: record.terms ?? "",
    items: sortedItems.map(toDomainScheduleLineItem),
    successCount: record.successCount,
    failureCount: record.failureCount,
    consecutiveFailures: record.consecutiveFailures,
    lastRunAt: record.lastRunAt ? record.lastRunAt.toISOString() : undefined,
    lastResult: record.lastResult ?? undefined,
    createdBy: record.createdBy ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};

export const toDomainOccurrence = (record: PrismaOccurrenceWithInvoice): RecurringOccurrence => ({
  id: record.id,
  organizationId: record.organizationId,
  scheduleId: record.scheduleId,
  periodKey: record.periodKey,
  status: toDomainOccurrenceStatus(record.status),
  attempts: record.attempts,
  claimedAt: record.claimedAt ? record.claimedAt.toISOString() : undefined,
  claimedBy: record.claimedBy ?? undefined,
  invoiceId: record.invoiceId ?? undefined,
  invoiceNumber: record.invoice?.invoiceNumber,
  error: record.error ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
