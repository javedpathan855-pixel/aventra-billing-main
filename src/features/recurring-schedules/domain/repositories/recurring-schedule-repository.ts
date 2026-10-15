import type {
  RecurringOccurrence,
  RecurringOccurrenceStatus,
  RecurringSchedule,
  RecurringScheduleStatus,
} from "../recurring-schedule";

export type RecurringScheduleFilterCriteria = {
  query?: string;
  status?: RecurringScheduleStatus;
  customerId?: string;
  frequency?: RecurringSchedule["frequency"];
  startDate?: string;
  endDate?: string;
};

export type SaveRecurringScheduleItemInput = {
  id: string;
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  sortOrder: number;
};

export type SaveRecurringScheduleInput = {
  id: string;
  organizationId: string;
  name: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  frequency: RecurringSchedule["frequency"];
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  timezone: string;
  status: RecurringScheduleStatus;
  paymentTerms: string;
  additionalCharges: number;
  additionalChargesLabel?: string | null;
  additionalDiscount: number;
  additionalDiscountType: "percentage" | "fixed";
  additionalDiscountLabel?: string | null;
  notes?: string | null;
  terms?: string | null;
  items: SaveRecurringScheduleItemInput[];
};

export type IRecurringScheduleRepository = {
  findById(organizationId: string, id: string): Promise<RecurringSchedule | null>;
  findMany(
    organizationId: string,
    criteria?: RecurringScheduleFilterCriteria,
  ): Promise<RecurringSchedule[]>;
  findActiveSchedules(limit?: number): Promise<RecurringSchedule[]>;
  create(input: SaveRecurringScheduleInput & { createdBy?: string | null }): Promise<RecurringSchedule>;
  update(
    organizationId: string,
    id: string,
    input: SaveRecurringScheduleInput,
  ): Promise<RecurringSchedule>;
  updateProgress(
    organizationId: string,
    id: string,
    progress: {
      nextRunDate?: string;
      status?: RecurringScheduleStatus;
      successCount?: number;
      failureCount?: number;
      consecutiveFailures?: number;
      lastRunAt?: Date;
      lastResult?: string | null;
    },
    txClient?: unknown,
  ): Promise<void>;
  delete(organizationId: string, id: string): Promise<number>;
};

export type IOccurrenceRepository = {
  findById(organizationId: string, id: string): Promise<RecurringOccurrence | null>;
  findBySchedule(
    organizationId: string,
    scheduleId: string,
  ): Promise<RecurringOccurrence[]>;
  findByPeriod(
    organizationId: string,
    scheduleId: string,
    periodKey: string,
    txClient?: unknown,
  ): Promise<RecurringOccurrence | null>;
  claimPeriod(
    organizationId: string,
    scheduleId: string,
    periodKey: string,
    claimedBy: string,
    txClient?: unknown,
  ): Promise<{ claimed: boolean; occurrence: RecurringOccurrence | null }>;
  markProcessing(
    organizationId: string,
    id: string,
    claimedBy: string,
    txClient?: unknown,
  ): Promise<boolean>;
  markSucceeded(
    organizationId: string,
    id: string,
    invoiceId: string,
    txClient?: unknown,
  ): Promise<void>;
  markFailed(
    organizationId: string,
    id: string,
    error: string,
    txClient?: unknown,
  ): Promise<void>;
  registerFailure(
    organizationId: string,
    id: string,
    error: string,
    txClient?: unknown,
  ): Promise<number>;
  resetToPending(organizationId: string, id: string, txClient?: unknown): Promise<void>;
  findInvoiceForPeriod(
    scheduleId: string,
    periodKey: string,
    txClient?: unknown,
  ): Promise<{ id: string; invoiceNumber: string } | null>;
};

export type { RecurringOccurrenceStatus };
