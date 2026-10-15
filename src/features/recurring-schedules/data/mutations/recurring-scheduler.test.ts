import { describe, expect, it, vi, beforeEach } from "vitest";
import { processDueSchedules } from "./run-recurring-scheduler";
import type { RecurringSchedule } from "../../domain/recurring-schedule";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockFindActiveSchedules = vi.fn();
const mockScheduleFindById = vi.fn();
const mockUpdateProgress = vi.fn();
const mockClaimPeriod = vi.fn();
const mockMarkProcessing = vi.fn();
const mockMarkSucceeded = vi.fn();
const mockMarkFailed = vi.fn();
const mockResetToPending = vi.fn();
const mockRegisterFailure = vi.fn();
const mockFindInvoiceForPeriod = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-recurring-repository", () => ({
  recurringScheduleRepository: {
    findActiveSchedules: (...args: unknown[]) => mockFindActiveSchedules(...args),
    findById: (...args: unknown[]) => mockScheduleFindById(...args),
    updateProgress: (...args: unknown[]) => mockUpdateProgress(...args),
  },
  occurrenceRepository: {
    claimPeriod: (...args: unknown[]) => mockClaimPeriod(...args),
    markProcessing: (...args: unknown[]) => mockMarkProcessing(...args),
    markSucceeded: (...args: unknown[]) => mockMarkSucceeded(...args),
    markFailed: (...args: unknown[]) => mockMarkFailed(...args),
    resetToPending: (...args: unknown[]) => mockResetToPending(...args),
    registerFailure: (...args: unknown[]) => mockRegisterFailure(...args),
    findInvoiceForPeriod: (...args: unknown[]) => mockFindInvoiceForPeriod(...args),
  },
}));

vi.mock("@/features/customers/infrastructure/repositories/prisma-customer-repository", () => ({
  customerRepository: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

const mockCreateInvoiceWithContext = vi.fn();
vi.mock("@/features/invoices/data/mutations/invoice-mutations", () => ({
  createInvoiceWithContext: (...args: unknown[]) => mockCreateInvoiceWithContext(...args),
}));
vi.mock("@/features/invoices/data/queries/get-supplier-tax-context", () => ({
  getSupplierTaxContext: vi.fn().mockResolvedValue({ state: "27-Maharashtra" }),
}));
vi.mock("@/features/invoices", () => ({
  calculateDueDate: () => "2026-10-30",
  calculateInvoiceTotals: () => ({ total: 59000 }),
  determineTaxMode: () => ({ taxMode: "CGST_SGST" }),
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})),
  }),
}));

const schedule = (overrides: Partial<RecurringSchedule> = {}): RecurringSchedule => ({
  id: "rsch-1",
  organizationId: "org-1",
  name: "Acme retainer",
  customerName: "Acme",
  customerEmail: "",
  customerAddress: "",
  customerGstin: "",
  frequency: "Monthly",
  startDate: "2026-09-15",
  nextRunDate: "2026-10-15",
  timezone: "Asia/Kolkata",
  status: "Active",
  paymentTerms: "Net 15 days",
  additionalCharges: 0,
  additionalDiscount: 0,
  additionalDiscountType: "fixed",
  notes: "",
  terms: "",
  items: [
    {
      id: "li-1",
      item: "Retainer",
      description: "",
      quantity: 1,
      unitPrice: 50000,
      discount: 0,
      taxRate: 18,
    },
  ],
  successCount: 0,
  failureCount: 0,
  consecutiveFailures: 0,
  ...overrides,
});

const NOW = new Date("2026-10-15T12:00:00.000Z");

describe("recurring scheduler processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindActiveSchedules.mockResolvedValue([]);
  });

  it("generates an invoice for a due schedule and advances it", async () => {
    const sched = schedule();
    mockFindActiveSchedules.mockResolvedValue([sched]);
    mockScheduleFindById.mockResolvedValue(sched);
    mockClaimPeriod.mockResolvedValue({
      claimed: true,
      occurrence: { id: "occ-1", attempts: 1 },
    });
    mockCreateInvoiceWithContext.mockResolvedValue({
      success: true,
      data: { id: "inv-1", number: "INV-0001" },
    });

    const summary = await processDueSchedules({ now: NOW, workerId: "test-worker" });

    expect(summary.schedulesChecked).toBe(1);
    expect(summary.succeeded).toBe(1);
    expect(mockCreateInvoiceWithContext).toHaveBeenCalledTimes(1);
    const [context, input] = mockCreateInvoiceWithContext.mock.calls[0] as [
      { organizationId: string; allowIssued: boolean; recurringLink: object },
      { status: string; amountPaid: number; issueDate: string },
    ];
    expect(context.organizationId).toBe("org-1");
    expect(context.allowIssued).toBe(true);
    expect(context.recurringLink).toEqual({
      recurringScheduleId: "rsch-1",
      recurringPeriod: "2026-10-15",
    });
    expect(input.status).toBe("Issued");
    expect(input.amountPaid).toBe(0);
    expect(input.issueDate).toBe("2026-10-15");
    expect(mockMarkSucceeded).toHaveBeenCalledWith("org-1", "occ-1", "inv-1", expect.anything());
    expect(mockUpdateProgress).toHaveBeenCalledWith(
      "org-1",
      "rsch-1",
      expect.objectContaining({ nextRunDate: "2026-11-15", successCount: 1 }),
      expect.anything(),
    );
  });

  it("skips schedules with nothing due and completes past end dates", async () => {
    const future = schedule({ id: "rsch-future", nextRunDate: "2026-12-15" });
    const ended = schedule({
      id: "rsch-ended",
      nextRunDate: "2026-10-15",
      endDate: "2026-09-15",
    });
    mockFindActiveSchedules.mockResolvedValue([future, ended]);

    const summary = await processDueSchedules({ now: NOW, workerId: "test-worker" });

    expect(summary.schedulesChecked).toBe(2);
    expect(summary.succeeded).toBe(0);
    expect(mockCreateInvoiceWithContext).not.toHaveBeenCalled();
    expect(mockUpdateProgress).toHaveBeenCalledWith(
      "org-1",
      "rsch-ended",
      expect.objectContaining({ status: "Completed" }),
    );
  });

  it("never advances the schedule when invoice creation fails", async () => {
    const sched = schedule();
    mockFindActiveSchedules.mockResolvedValue([sched]);
    mockScheduleFindById.mockResolvedValue(sched);
    mockClaimPeriod.mockResolvedValue({
      claimed: true,
      occurrence: { id: "occ-1", attempts: 1 },
    });
    mockCreateInvoiceWithContext.mockResolvedValue({
      success: false,
      error: "Validation failed.",
    });
    mockRegisterFailure.mockResolvedValue(2);

    const summary = await processDueSchedules({ now: NOW, workerId: "test-worker" });

    expect(summary.failed).toBe(1);
    expect(mockResetToPending).toHaveBeenCalledWith("org-1", "occ-1");
    const progressCalls = mockUpdateProgress.mock.calls.map((call) => call[2]) as Array<{
      nextRunDate?: string;
    }>;
    expect(progressCalls.every((p) => p.nextRunDate === undefined)).toBe(true);
  });

  it("does not duplicate when the occurrence already succeeded", async () => {
    const sched = schedule();
    mockFindActiveSchedules.mockResolvedValue([sched]);
    mockScheduleFindById.mockResolvedValue(sched);
    mockClaimPeriod.mockResolvedValue({
      claimed: false,
      occurrence: { id: "occ-1", status: "Succeeded" },
    });

    const summary = await processDueSchedules({ now: NOW, workerId: "test-worker" });

    expect(summary.succeeded).toBe(0);
    expect(mockCreateInvoiceWithContext).not.toHaveBeenCalled();
  });

  it("recovers a stale processing claim that already produced an invoice", async () => {
    const sched = schedule();
    mockFindActiveSchedules.mockResolvedValue([sched]);
    mockScheduleFindById.mockResolvedValue(sched);
    mockClaimPeriod.mockResolvedValue({
      claimed: false,
      occurrence: {
        id: "occ-1",
        status: "Processing",
        claimedAt: new Date("2026-10-15T10:00:00.000Z").toISOString(),
      },
    });
    mockFindInvoiceForPeriod.mockResolvedValue({ id: "inv-9", invoiceNumber: "INV-0009" });

    const summary = await processDueSchedules({
      now: new Date("2026-10-15T12:00:00.000Z"),
      workerId: "test-worker",
    });

    expect(summary.succeeded).toBe(1);
    expect(mockCreateInvoiceWithContext).not.toHaveBeenCalled();
    expect(mockMarkSucceeded).toHaveBeenCalledWith("org-1", "occ-1", "inv-9", expect.anything());
  });

  it("pauses a schedule after exhausting retries", async () => {
    const sched = schedule();
    mockFindActiveSchedules.mockResolvedValue([sched]);
    mockScheduleFindById.mockResolvedValue(sched);
    mockClaimPeriod.mockResolvedValue({
      claimed: true,
      occurrence: { id: "occ-1", attempts: 4 },
    });
    mockCreateInvoiceWithContext.mockResolvedValue({ success: false, error: "Boom." });
    mockRegisterFailure.mockResolvedValue(5);

    const summary = await processDueSchedules({ now: NOW, workerId: "test-worker" });

    expect(summary.failed).toBe(1);
    expect(mockMarkFailed).toHaveBeenCalled();
    expect(mockUpdateProgress).toHaveBeenCalledWith(
      "org-1",
      "rsch-1",
      expect.objectContaining({ status: "Paused" }),
      expect.anything(),
    );
    expect(mockResetToPending).not.toHaveBeenCalled();
  });
});
