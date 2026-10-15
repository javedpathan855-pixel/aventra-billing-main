import type {
  RecurringFrequency,
  RecurringOccurrence,
  RecurringOccurrenceStatus,
  RecurringScheduleStatus,
} from "../../domain/recurring-schedule";

export type RecurringActionResult<T = unknown> =
  | {
      success: true;
      data: T;
      error?: never;
      fieldErrors?: never;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
      data?: never;
    };

export type RecurringScheduleLineItemInputDto = {
  id?: string;
  productId?: string;
  item: string;
  description?: string;
  hsnSac?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type CreateRecurringScheduleInputDto = {
  name: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  customerPlaceOfSupply?: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextRunDate?: string;
  timezone?: string;
  paymentTerms?: string;
  additionalCharges?: number;
  additionalChargesLabel?: string;
  additionalDiscount?: number;
  additionalDiscountType?: "percentage" | "fixed";
  additionalDiscountLabel?: string;
  notes?: string;
  terms?: string;
  items: RecurringScheduleLineItemInputDto[];
};

export type UpdateRecurringScheduleInputDto = {
  id: string;
  name: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  customerPlaceOfSupply?: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextRunDate?: string;
  timezone?: string;
  paymentTerms?: string;
  additionalCharges?: number;
  additionalChargesLabel?: string;
  additionalDiscount?: number;
  additionalDiscountType?: "percentage" | "fixed";
  additionalDiscountLabel?: string;
  notes?: string;
  terms?: string;
  items: RecurringScheduleLineItemInputDto[];
};

export type { RecurringOccurrence };

export type SchedulerRunSummary = {
  schedulesChecked: number;
  occurrencesProcessed: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

export type { RecurringFrequency, RecurringOccurrenceStatus, RecurringScheduleStatus };
