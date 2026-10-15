/**
 * Recurring schedule domain model.
 *
 * A schedule is a template describing WHAT should be billed and WHEN — it is
 * never itself an invoice. Each billing period produces an ordinary invoice
 * through the existing invoice system, recorded by a durable occurrence row.
 * Editing a schedule affects future generations only; generated invoices are
 * independent persisted documents with their own snapshots.
 */
export type RecurringFrequency = "Weekly" | "Monthly" | "Quarterly" | "Yearly";
export type RecurringScheduleStatus = "Active" | "Paused" | "Completed" | "Cancelled";
export type RecurringOccurrenceStatus = "Pending" | "Processing" | "Succeeded" | "Failed";

export const RECURRING_FREQUENCIES: RecurringFrequency[] = [
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];

export type RecurringScheduleLineItem = {
  id: string;
  productId?: string;
  item: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type RecurringSchedule = {
  id: string;
  organizationId: string;
  name: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  customerPlaceOfSupply?: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  timezone: string;
  status: RecurringScheduleStatus;
  paymentTerms: string;
  additionalCharges: number;
  additionalChargesLabel?: string;
  additionalDiscount: number;
  additionalDiscountType: "percentage" | "fixed";
  additionalDiscountLabel?: string;
  notes: string;
  terms: string;
  items: RecurringScheduleLineItem[];
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastRunAt?: string;
  lastResult?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RecurringOccurrence = {
  id: string;
  organizationId: string;
  scheduleId: string;
  periodKey: string;
  status: RecurringOccurrenceStatus;
  attempts: number;
  claimedAt?: string;
  claimedBy?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Operational bounds (documented policy, see recurrence-rules.ts). */
export const MAX_OCCURRENCES_PER_SCHEDULE_RUN = 10;
export const MAX_OCCURRENCE_ATTEMPTS = 5;
export const STALE_CLAIM_MINUTES = 15;
export const MAX_SCHEDULES_PER_RUN = 100;

export const canEditSchedule = (status: RecurringScheduleStatus): boolean =>
  status === "Active" || status === "Paused";

export const canPauseSchedule = (status: RecurringScheduleStatus): boolean =>
  status === "Active";

export const canResumeSchedule = (status: RecurringScheduleStatus): boolean =>
  status === "Paused";

export const canCompleteSchedule = (status: RecurringScheduleStatus): boolean =>
  status === "Active" || status === "Paused";

export const isTerminalScheduleStatus = (status: RecurringScheduleStatus): boolean =>
  status === "Completed" || status === "Cancelled";

export const validateRecurringLineItems = (
  items: readonly RecurringScheduleLineItem[],
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!items || items.length === 0) {
    errors.items = "Add at least one line item to the schedule.";
    return errors;
  }

  items.forEach((line, index) => {
    if (!line.item.trim()) {
      errors[`item-${index}`] = "Item or description is required.";
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      errors[`quantity-${index}`] = "Quantity must be greater than zero.";
    }
    if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
      errors[`price-${index}`] = "Enter a valid unit price.";
    }
    if (!Number.isFinite(line.discount) || line.discount < 0 || line.discount > 100) {
      errors[`discount-${index}`] = "Discount must be between 0% and 100%.";
    }
    if (!Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100) {
      errors[`tax-${index}`] = "Tax rate must be between 0% and 100%.";
    }
  });

  return errors;
};
