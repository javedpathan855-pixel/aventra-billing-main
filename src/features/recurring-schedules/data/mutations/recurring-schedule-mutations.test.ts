import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cancelRecurringScheduleAction,
  completeRecurringScheduleAction,
  createRecurringScheduleAction,
  deleteRecurringScheduleAction,
  pauseRecurringScheduleAction,
  resumeRecurringScheduleAction,
  updateRecurringScheduleAction,
} from "./recurring-schedule-mutations";
import { resolveRecurringScheduleContext } from "../context/recurring-schedule-context";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/recurring-schedule-context", () => ({
  resolveRecurringScheduleContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: "owner",
  }),
}));

const mockScheduleCreate = vi.fn();
const mockScheduleUpdate = vi.fn();
const mockScheduleFindById = vi.fn();
const mockScheduleDelete = vi.fn();
const mockUpdateProgress = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-recurring-repository", () => ({
  recurringScheduleRepository: {
    create: (...args: unknown[]) => mockScheduleCreate(...args),
    update: (...args: unknown[]) => mockScheduleUpdate(...args),
    findById: (...args: unknown[]) => mockScheduleFindById(...args),
    delete: (...args: unknown[]) => mockScheduleDelete(...args),
    updateProgress: (...args: unknown[]) => mockUpdateProgress(...args),
  },
  occurrenceRepository: {},
}));

vi.mock("@/features/customers/infrastructure/repositories/prisma-customer-repository", () => ({
  customerRepository: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/features/products/infrastructure/repositories/prisma-product-repository", () => ({
  productRepository: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

const validInput = {
  name: "Acme monthly retainer",
  customerName: "Acme Corp",
  frequency: "Monthly" as const,
  startDate: "2026-10-15",
  items: [{ item: "Retainer", quantity: 1, unitPrice: 50000, discount: 0, taxRate: 18 }],
};

describe("recurring schedule mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an Active schedule defaulting next run to the start date", async () => {
    mockScheduleCreate.mockImplementation(async (input: Record<string, unknown>) => ({
      ...input,
      id: "rsch-1",
    }));

    const res = await createRecurringScheduleAction(validInput);

    expect(res.success).toBe(true);
    expect(mockScheduleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-test-123",
        status: "Active",
        nextRunDate: "2026-10-15",
        createdBy: "user-test-456",
      }),
    );
  });

  it("denies schedule creation to plain members", async () => {
    vi.mocked(resolveRecurringScheduleContext).mockResolvedValueOnce({
      organizationId: "org-test-123",
      userId: "user-member",
      memberRole: "member",
    });

    const res = await createRecurringScheduleAction(validInput);

    expect(res.success).toBe(false);
    expect(res.error).toContain("Only organization owners or admins can create recurring schedules");
    expect(mockScheduleCreate).not.toHaveBeenCalled();
  });

  it("rejects creation with an end date before the start date", async () => {
    const res = await createRecurringScheduleAction({
      ...validInput,
      startDate: "2026-10-15",
      endDate: "2026-09-15",
    });

    expect(res.success).toBe(false);
    expect(mockScheduleCreate).not.toHaveBeenCalled();
  });

  it("rejects editing a completed schedule", async () => {
    mockScheduleFindById.mockResolvedValue({ id: "rsch-1", status: "Completed", successCount: 5 });

    const res = await updateRecurringScheduleAction({ ...validInput, id: "rsch-1" });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Cannot perform operation 'edit'");
    expect(mockScheduleUpdate).not.toHaveBeenCalled();
  });

  it("preserves nextRunDate on edit unless an ungenerated start moved", async () => {
    mockScheduleFindById.mockResolvedValue({
      id: "rsch-1",
      status: "Active",
      startDate: "2026-10-15",
      nextRunDate: "2026-11-15",
      successCount: 1,
    });
    mockScheduleUpdate.mockImplementation(async (_org: string, _id: string, input: unknown) => input);

    const res = await updateRecurringScheduleAction({ ...validInput, id: "rsch-1" });

    expect(res.success).toBe(true);
    expect(mockScheduleUpdate).toHaveBeenCalledWith(
      "org-test-123",
      "rsch-1",
      expect.objectContaining({ nextRunDate: "2026-11-15" }),
    );
  });

  it("pauses and resumes through valid transitions only", async () => {
    mockScheduleFindById.mockResolvedValue({ id: "rsch-1", status: "Active" });
    expect((await pauseRecurringScheduleAction("rsch-1")).success).toBe(true);
    expect(mockUpdateProgress).toHaveBeenCalledWith(
      "org-test-123",
      "rsch-1",
      expect.objectContaining({ status: "Paused" }),
    );

    mockScheduleFindById.mockResolvedValue({ id: "rsch-1", status: "Paused" });
    expect((await resumeRecurringScheduleAction("rsch-1")).success).toBe(true);

    mockScheduleFindById.mockResolvedValue({ id: "rsch-1", status: "Completed" });
    const bad = await pauseRecurringScheduleAction("rsch-1");
    expect(bad.success).toBe(false);
    expect(bad.error).toContain("Cannot perform operation 'pause'");
  });

  it("completes and cancels editable schedules", async () => {
    mockScheduleFindById.mockResolvedValue({ id: "rsch-1", status: "Active" });
    expect((await completeRecurringScheduleAction("rsch-1")).success).toBe(true);
    expect((await cancelRecurringScheduleAction("rsch-1")).success).toBe(true);
  });

  it("refuses to delete schedules with generated invoices", async () => {
    mockScheduleFindById.mockResolvedValue({ id: "rsch-1", status: "Completed" });
    mockScheduleDelete.mockResolvedValue(0);

    const res = await deleteRecurringScheduleAction("rsch-1");

    expect(res.success).toBe(false);
    expect(res.error).toContain("cannot be deleted");
  });

  it("deletes schedules with no generated invoices", async () => {
    mockScheduleFindById.mockResolvedValue({ id: "rsch-1", status: "Active" });
    mockScheduleDelete.mockResolvedValue(1);

    const res = await deleteRecurringScheduleAction("rsch-1");

    expect(res.success).toBe(true);
  });

  it("denies pause to plain members with no side effects", async () => {
    vi.mocked(resolveRecurringScheduleContext).mockResolvedValueOnce({
      organizationId: "org-test-123",
      userId: "user-member",
      memberRole: "member",
    });

    const res = await pauseRecurringScheduleAction("rsch-1");

    expect(res.success).toBe(false);
    expect(mockUpdateProgress).not.toHaveBeenCalled();
  });
});
