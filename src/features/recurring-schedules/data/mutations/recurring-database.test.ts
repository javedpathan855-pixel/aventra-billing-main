/**
 * Database-backed integration tests for recurring schedules: persistence,
 * end-to-end generation, idempotency, concurrency, rollback, isolation,
 * permissions, and lifecycle behavior.
 *
 * Runs ONLY when AVENTRA_TEST_DATABASE_URL is set, pointing at an isolated
 * PostgreSQL test database with all project migrations applied
 * (`prisma migrate deploy`). Never touches production data. Without the env
 * var the suite skips, keeping the default unit run dependency-free.
 *
 * Dates are relative to the REAL system clock (not fixed fixtures): the
 * scheduler's staleness and due-date math compare against real time, so
 * fixed future dates would falsely age claims. Multi-day margins absorb any
 * timezone skew between UTC and the schedule zone.
 */
const TEST_DATABASE_URL = process.env.AVENTRA_TEST_DATABASE_URL;
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { getPrisma } from "@/shared/lib/prisma";
import { getAuthState } from "@/features/auth";
import { createInvoiceWithContext } from "@/features/invoices/data/mutations/invoice-mutations";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import {
  createRecurringScheduleAction,
  deleteRecurringScheduleAction,
  pauseRecurringScheduleAction,
} from "./recurring-schedule-mutations";
import {
  processDueSchedules,
  processScheduleNow,
} from "./run-recurring-scheduler";
import { triggerRecurringScheduleAction } from "./trigger-recurring-schedule";
import { updateBillingSettingsAction } from "@/features/billing-settings/data/mutations/billing-settings-mutations";
import { recurringScheduleRepository } from "../../infrastructure/repositories/prisma-recurring-repository";
import {
  advanceRecurrence,
  anchorDayOf,
} from "../../domain/rules/recurrence-rules";
import type { RecurringSchedule } from "../../domain/recurring-schedule";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  getAuthState: vi.fn(),
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

const mockGetAuthState = vi.mocked(getAuthState);
let seq = 9000;
const unique = (prefix: string): string => `${prefix}-${Date.now()}-${(seq += 1)}`;

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);
const daysAgoStr = (n: number): string => isoDay(new Date(Date.now() - n * 86400000));

/** Expected monthly chain from a start date for `count` periods. */
const monthlyChain = (startDate: string, count: number): string[] => {
  const anchor = anchorDayOf(startDate);
  const chain: string[] = [];
  let cursor = startDate;
  for (let i = 0; i < count; i += 1) {
    chain.push(cursor);
    cursor = advanceRecurrence({ frequency: "Monthly", fromDate: cursor, anchorDay: anchor });
  }
  return chain;
};

type SeededOrg = {
  org: { id: string; name: string; slug: string };
  owner: { id: string; name: string; email: string };
  member: { id: string; name: string; email: string };
  customerId: string;
};

const seedOrg = async (): Promise<SeededOrg> => {
  const prisma = getPrisma();
  const tag = unique("t");
  const org = { id: `org_${tag}`, name: `Test Org ${tag}`, slug: `test-org-${tag}` };
  const owner = { id: `user_owner_${tag}`, name: "Owner", email: `owner-${tag}@example.com` };
  const member = { id: `user_member_${tag}`, name: "Member", email: `member-${tag}@example.com` };
  const now = new Date();
  await prisma.organization.create({ data: { id: org.id, name: org.name, slug: org.slug, createdAt: now } });
  await prisma.user.createMany({
    data: [
      { id: owner.id, name: owner.name, email: owner.email, emailVerified: true },
      { id: member.id, name: member.name, email: member.email, emailVerified: true },
    ],
  });
  await prisma.member.createMany({
    data: [
      { id: `mem_owner_${tag}`, organizationId: org.id, userId: owner.id, role: "owner", createdAt: now },
      { id: `mem_member_${tag}`, organizationId: org.id, userId: member.id, role: "member", createdAt: now },
    ],
  });
  await prisma.organizationAddress.create({
    data: {
      organizationId: org.id,
      country: "India",
      state: "27-Maharashtra",
      city: "Pune",
      postalCode: "411001",
      addressLine: "1 Test Street",
    },
  });
  await prisma.organizationTaxProfile.create({
    data: { organizationId: org.id, gstNumber: "27AABCG9912D1Z9", panNumber: "AABCG9912D" },
  });
  const customer = await prisma.customer.create({
    data: {
      id: `cust_${tag}`,
      organizationId: org.id,
      name: "Acme",
      billingAddressLine1: "1 Street",
      billingCity: "Pune",
      billingState: "Maharashtra",
      billingPinCode: "411001",
    },
  });
  return { org, owner, member, customerId: customer.id };
};

const authAs = (seeded: SeededOrg, who: "owner" | "member"): void => {
  const user = who === "owner" ? seeded.owner : seeded.member;
  mockGetAuthState.mockResolvedValue({
    status: "authenticated",
    user: { id: user.id, name: user.name, email: user.email, emailVerified: true },
    organization: {
      id: seeded.org.id,
      name: seeded.org.name,
      slug: seeded.org.slug,
      role: who,
      onboardingStatus: "COMPLETED",
    },
  });
};

const scheduleInput = (customerId: string, overrides: Record<string, unknown> = {}) => ({
  name: "Acme monthly retainer",
  customerId,
  customerName: "Acme",
  frequency: "Monthly" as const,
  startDate: daysAgoStr(65),
  timezone: "Asia/Kolkata",
  paymentTerms: "Net 15 days",
  items: [{ item: "Retainer", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
  ...overrides,
});

const createSchedule = async (seeded: SeededOrg, overrides: Record<string, unknown> = {}) => {
  authAs(seeded, "owner");
  const res = await createRecurringScheduleAction(
    scheduleInput(seeded.customerId, overrides),
  );
  expect(res.success).toBe(true);
  if (!res.success) throw new Error("schedule creation failed in test setup");
  return res.data;
};

describe.skipIf(!TEST_DATABASE_URL)("recurring schedule database integration", () => {
  // Recurring tables are exclusive to this suite (no other database suite
  // touches them), so per-test cleanup is race-free. The global scheduler
  // processes every due schedule, therefore each test starts with zero
  // schedules and asserts only rows scoped to its own organization.
  // (Invoice rows are never truncated — other suites share that table.)
  beforeEach(async () => {
    vi.clearAllMocks();
    await getPrisma().recurringSchedule.deleteMany({});
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("saves a schedule without issuing an invoice or consuming a number", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const settingsBefore = await prisma.billingSettings.findMany({
      where: { organizationId: seeded.org.id },
    });
    await createSchedule(seeded, { startDate: daysAgoStr(400) });

    // No invoice exists and the INVOICE sequence is untouched.
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(0);
    const settingsAfter = await prisma.billingSettings.findMany({
      where: { organizationId: seeded.org.id },
    });
    expect(settingsAfter.map((s) => `${s.documentType}:${s.nextNumber}`)).toEqual(
      settingsBefore.map((s) => `${s.documentType}:${s.nextNumber}`),
    );
  });

  it("persists a schedule and reloads it with items", async () => {
    const seeded = await seedOrg();
    const saved = await createSchedule(seeded);

    expect(saved.name).toBe("Acme monthly retainer");
    expect(saved.status).toBe("Active");
    expect(saved.nextRunDate).toBe(daysAgoStr(65));
    expect(saved.items).toHaveLength(1);

    authAs(seeded, "owner");
    const reloaded = await recurringScheduleRepository.findById(seeded.org.id, saved.id);
    expect(reloaded?.frequency).toBe("Monthly");
    expect(reloaded?.timezone).toBe("Asia/Kolkata");
    expect(reloaded?.items[0].unitPrice).toBe(10000);
  });

  it("generates ordinary issued invoices and advances the schedule", async () => {
    const seeded = await seedOrg();
    const startDate = daysAgoStr(65);
    await createSchedule(seeded, { startDate });
    const prisma = getPrisma();

    // ~65 days behind: three monthly periods are due.
    const summary = await processDueSchedules({ workerId: "test-1" });

    expect(summary.schedulesChecked).toBe(1);
    expect(summary.succeeded).toBe(3);

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: seeded.org.id },
      orderBy: { recurringPeriod: "asc" },
    });
    expect(invoices).toHaveLength(3);
    expect(invoices.map((inv) => inv.recurringPeriod)).toEqual(monthlyChain(startDate, 3));
    for (const inv of invoices) {
      expect(inv.status).toBe("ISSUED");
      expect(inv.invoiceNumber).toMatch(/^INV-/);
      expect(Number(inv.total)).toBe(11800);
      expect(Number(inv.amountPaid)).toBe(0);
      expect(inv.recurringScheduleId).not.toBeNull();
      expect(inv.customerName).toBe("Acme");
    }
    expect(new Set(invoices.map((inv) => inv.invoiceNumber)).size).toBe(3);

    const scheduleId = invoices[0].recurringScheduleId ?? "";
    const reloaded = await recurringScheduleRepository.findById(seeded.org.id, scheduleId);
    expect(reloaded?.nextRunDate).toBe(monthlyChain(startDate, 4)[3]);
    expect(reloaded?.successCount).toBe(3);
    expect(reloaded?.consecutiveFailures).toBe(0);

    // A second run finds nothing due — no duplicates.
    const second = await processDueSchedules({ workerId: "test-2" });
    expect(second.succeeded).toBe(0);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(3);
  });

  it("catches up every missed period as separate invoices", async () => {
    const seeded = await seedOrg();
    const startDate = daysAgoStr(125);
    await createSchedule(seeded, { startDate });

    await processDueSchedules({ workerId: "test-catchup" });

    const prisma = getPrisma();
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: seeded.org.id },
      orderBy: { recurringPeriod: "asc" },
    });
    // Expected periods derived from the unit-tested date helpers; the
    // database test proves end-to-end wiring (claim → invoice → advance).
    const { collectDuePeriods } = await import(
      "../../domain/rules/recurrence-rules"
    );
    const { todayInTimezone } = await import(
      "../../domain/rules/recurrence-rules"
    );
    const expected = collectDuePeriods({
      frequency: "Monthly",
      anchorDay: anchorDayOf(startDate),
      nextRunDate: startDate,
      today: todayInTimezone("Asia/Kolkata"),
      maxPeriods: 10,
    });
    expect(expected.length).toBeGreaterThan(1);
    expect(invoices.map((inv) => inv.recurringPeriod)).toEqual(expected);
    const numbers = new Set(invoices.map((inv) => inv.invoiceNumber));
    expect(numbers.size).toBe(expected.length);
  });

  it("produces exactly one invoice under concurrent workers", async () => {
    const seeded = await seedOrg();
    await createSchedule(seeded, { startDate: daysAgoStr(5) });
    const prisma = getPrisma();

    const [a, b] = await Promise.all([
      processDueSchedules({ workerId: "worker-a" }),
      processDueSchedules({ workerId: "worker-b" }),
    ]);

    expect(a.succeeded + b.succeeded).toBe(1);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(1);
  });

  it("keeps manual trigger and scheduled execution from duplicating", async () => {
    const seeded = await seedOrg();
    const saved = await createSchedule(seeded, { startDate: daysAgoStr(5) });
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const [manual, scheduled] = await Promise.all([
      triggerRecurringScheduleAction(saved.id),
      processScheduleNow(seeded.org.id, saved.id, { workerId: "cron-x" }),
    ]);

    const totalSucceeded =
      (manual.success ? manual.data.succeeded : 0) +
      (scheduled.succeeded);
    expect(totalSucceeded).toBe(1);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(1);
  });

  it("bills from the snapshot when the customer record is gone", async () => {
    const seeded = await seedOrg();
    const saved = await createSchedule(seeded, { startDate: daysAgoStr(5) });
    const prisma = getPrisma();
    // Deleting the customer nulls the schedule reference (SetNull); the
    // frozen snapshot keeps billing working instead of failing.
    await prisma.customer.deleteMany({ where: { id: seeded.customerId } });

    const summary = await processDueSchedules({ workerId: "test-gone" });

    expect(summary.failed).toBe(0);
    expect(summary.succeeded).toBe(1);
    const invoice = await prisma.invoice.findFirst({
      where: { organizationId: seeded.org.id },
    });
    expect(invoice?.customerName).toBe("Acme");
    expect(invoice?.customerId).toBeNull();
    const reloaded = await recurringScheduleRepository.findById(seeded.org.id, saved.id);
    expect(reloaded?.successCount).toBe(1);
  });

  it("fails visibly without advancing on a degenerate template", async () => {
    const seeded = await seedOrg();
    const saved = await createSchedule(seeded, {
      startDate: daysAgoStr(5),
      items: [{ item: "Freebie", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }],
    });
    const prisma = getPrisma();

    const summary = await processDueSchedules({ workerId: "test-degenerate" });

    expect(summary.failed).toBe(1);
    expect(summary.succeeded).toBe(0);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(0);

    const reloaded = (await recurringScheduleRepository.findById(
      seeded.org.id,
      saved.id,
    )) as RecurringSchedule;
    // Failed operations never advance the schedule.
    expect(reloaded.nextRunDate).toBe(daysAgoStr(5));
    expect(reloaded.consecutiveFailures).toBe(1);
    const occurrences = await prisma.recurringOccurrence.findMany({
      where: { scheduleId: saved.id },
    });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].status).toBe("PENDING");
    expect(occurrences[0].error).toContain("non-positive");
  });

  it("recovers a stale claim that already produced an invoice", async () => {
    const seeded = await seedOrg();
    const period = daysAgoStr(5);
    const saved = await createSchedule(seeded, { startDate: period });
    const prisma = getPrisma();

    // Simulate an interrupted run: invoice persisted, occurrence stuck.
    const created = await createInvoiceWithContext(
      { organizationId: seeded.org.id, allowIssued: true },
      {
        customerName: "Acme",
        customerPlaceOfSupply: "27-Maharashtra",
        issueDate: period,
        dueDate: period,
        status: "Issued",
        items: [{ item: "Retainer", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
      },
    );
    expect(created.success).toBe(true);
    const invoiceId = created.data?.id ?? "";
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { recurringScheduleId: saved.id, recurringPeriod: period },
    });
    await prisma.recurringOccurrence.create({
      data: {
        id: `occ_stale_${unique("s")}`,
        organizationId: seeded.org.id,
        scheduleId: saved.id,
        periodKey: period,
        status: "PROCESSING",
        attempts: 1,
        claimedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        claimedBy: "dead-worker",
      },
    });

    const summary = await processDueSchedules({ workerId: "test-recover" });

    expect(summary.succeeded).toBe(1);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(1);
    const occurrences = await prisma.recurringOccurrence.findMany({
      where: { scheduleId: saved.id },
    });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].status).toBe("SUCCEEDED");
    expect(occurrences[0].invoiceId).toBe(invoiceId);
  });

  it("pauses, skips generation while paused, and resumes with catch-up", async () => {
    const seeded = await seedOrg();
    const saved = await createSchedule(seeded, { startDate: daysAgoStr(65) });
    authAs(seeded, "owner");
    const prisma = getPrisma();

    expect((await pauseRecurringScheduleAction(saved.id)).success).toBe(true);
    const paused = await processDueSchedules({ workerId: "test-paused" });
    expect(paused.succeeded).toBe(0);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(0);

    const { resumeRecurringScheduleAction } = await import(
      "./recurring-schedule-mutations"
    );
    expect((await resumeRecurringScheduleAction(saved.id)).success).toBe(true);
    const resumed = await processDueSchedules({ workerId: "test-resumed" });
    expect(resumed.succeeded).toBe(3);
  });

  it("completes past the end date without generating", async () => {
    const seeded = await seedOrg();
    // Window comfortably inside the past: three full periods bill, then completion.
    await createSchedule(seeded, {
      startDate: daysAgoStr(100),
      endDate: daysAgoStr(25),
    });
    const prisma = getPrisma();

    const first = await processDueSchedules({ workerId: "test-end-1" });
    expect(first.succeeded).toBe(3);
    const schedules = await recurringScheduleRepository.findMany(seeded.org.id);
    expect(schedules[0].status).toBe("Completed");

    const second = await processDueSchedules({ workerId: "test-end-2" });
    expect(second.succeeded).toBe(0);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(3);
  });

  it("keeps generated invoices immutable across schedule edits", async () => {
    const seeded = await seedOrg();
    const startDate = daysAgoStr(65);
    const saved = await createSchedule(seeded, { startDate });
    authAs(seeded, "owner");
    const prisma = getPrisma();

    await processDueSchedules({ workerId: "test-edit-1" });
    const before = await prisma.invoice.findMany({
      where: { organizationId: seeded.org.id },
      orderBy: { recurringPeriod: "asc" },
    });
    expect(before).toHaveLength(3);
    expect(before.map((inv) => inv.recurringPeriod)).toEqual(monthlyChain(startDate, 3));

    const { updateRecurringScheduleAction: updateAction } = await import(
      "./recurring-schedule-mutations"
    );
    const updated = await updateAction({
      id: saved.id,
      name: saved.name,
      customerName: "Acme",
      frequency: "Monthly",
      startDate: saved.startDate,
      timezone: saved.timezone,
      items: [{ item: "Retainer Plus", quantity: 1, unitPrice: 20000, discount: 0, taxRate: 18 }],
    });
    expect(updated.success).toBe(true);

    await processDueSchedules({
      now: new Date(Date.now() + 40 * 86400000),
      workerId: "test-edit-2",
    });
    const all = await prisma.invoice.findMany({
      where: { organizationId: seeded.org.id },
      orderBy: { recurringPeriod: "asc" },
    });
    expect(all).toHaveLength(4);
    // Earlier invoices keep their original snapshots and totals.
    for (const inv of all.slice(0, 3)) {
      expect(Number(inv.total)).toBe(11800);
    }
    const firstItems = await prisma.invoiceItem.findMany({ where: { invoiceId: all[0].id } });
    expect(firstItems[0].item).toBe("Retainer");
    // Latest invoice uses the edited template.
    expect(Number(all[3].total)).toBe(23600);
  });

  it("enforces organization isolation for reads and triggers", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();
    const saved = await createSchedule(orgA);
    authAs(orgB, "owner");

    expect(await recurringScheduleRepository.findById(orgB.org.id, saved.id)).toBeNull();
    const triggered = await triggerRecurringScheduleAction(saved.id);
    expect(triggered.success).toBe(true);
    if (triggered.success) {
      expect(triggered.data.succeeded).toBe(0);
    }
    expect(
      await getPrisma().invoice.count({ where: { organizationId: orgA.org.id } }),
    ).toBe(0);
  });

  it("enforces owner/admin checks for schedule management", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "member");
    const prisma = getPrisma();

    const denied = await createRecurringScheduleAction(scheduleInput(seeded.customerId));
    expect(denied.success).toBe(false);
    expect(
      await prisma.recurringSchedule.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(0);

    const saved = await createSchedule(seeded);
    authAs(seeded, "member");
    expect((await triggerRecurringScheduleAction(saved.id)).success).toBe(false);
    expect((await pauseRecurringScheduleAction(saved.id)).success).toBe(false);
    expect(
      await prisma.invoice.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(0);

    authAs(seeded, "owner");
    const triggered = await triggerRecurringScheduleAction(saved.id);
    expect(triggered.success).toBe(true);
  });

  it("deletes only schedules without generated invoices", async () => {
    const seeded = await seedOrg();
    const fresh = await createSchedule(seeded, { name: "Disposable" });
    authAs(seeded, "owner");
    const prisma = getPrisma();

    expect((await deleteRecurringScheduleAction(fresh.id)).success).toBe(true);
    expect(
      await prisma.recurringSchedule.count({ where: { id: fresh.id } }),
    ).toBe(0);

    const used = await createSchedule(seeded, { name: "Used", startDate: daysAgoStr(5) });
    await processDueSchedules({ workerId: "test-del" });
    const refused = await deleteRecurringScheduleAction(used.id);
    expect(refused.success).toBe(false);
    expect(
      await prisma.recurringSchedule.count({ where: { id: used.id } }),
    ).toBe(1);
  });

  it("allocates unique invoice numbers across concurrent schedules", async () => {
    const seeded = await seedOrg();
    await createSchedule(seeded, { name: "Schedule A", startDate: daysAgoStr(5) });
    await createSchedule(seeded, { name: "Schedule B", startDate: daysAgoStr(5) });
    const prisma = getPrisma();

    await processDueSchedules({ workerId: "test-nums" });

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: seeded.org.id },
    });
    expect(invoices).toHaveLength(2);
    expect(new Set(invoices.map((inv) => inv.invoiceNumber)).size).toBe(2);
  });

  it("reloads generated invoices through the ordinary invoice repository", async () => {
    const seeded = await seedOrg();
    await createSchedule(seeded, { startDate: daysAgoStr(5) });

    await processDueSchedules({ workerId: "test-reload" });

    const prisma = getPrisma();
    const row = await prisma.invoice.findFirst({
      where: { organizationId: seeded.org.id },
    });
    const reloaded = await invoiceRepository.findById(seeded.org.id, row?.id ?? "");
    expect(reloaded?.number).toBe(row?.invoiceNumber);
    expect(reloaded?.status).toBe("Issued");
  });

  it("applies later Billing Settings and customer changes to future generations only", async () => {
    const seeded = await seedOrg();
    // One period due now; the second run happens after the changes below.
    await createSchedule(seeded, { startDate: daysAgoStr(5) });
    authAs(seeded, "owner");
    const prisma = getPrisma();

    await processDueSchedules({ workerId: "test-live-1" });
    const first = await prisma.invoice.findFirst({
      where: { organizationId: seeded.org.id },
      orderBy: { recurringPeriod: "asc" },
    });
    expect(first?.invoiceNumber).toMatch(/^INV-/);

    // Change the invoice prefix and the customer address mid-schedule.
    // Numbering and customer blocks are evaluated at generation time.
    const saved = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "SUB-",
      padding: 4,
    });
    expect(saved.success).toBe(true);
    await prisma.customer.update({
      where: { id: seeded.customerId },
      data: { billingAddressLine1: "99 New Road" },
    });

    await processDueSchedules({
      now: new Date(Date.now() + 40 * 86400000),
      workerId: "test-live-2",
    });
    const all = await prisma.invoice.findMany({
      where: { organizationId: seeded.org.id },
      orderBy: { recurringPeriod: "asc" },
    });
    expect(all).toHaveLength(2);
    // Historical invoice keeps the old prefix and address.
    expect(all[0].invoiceNumber).toMatch(/^INV-/);
    expect(all[0].customerAddress).toContain("1 Street");
    // Future generation uses the live prefix and refreshed customer data.
    expect(all[1].invoiceNumber).toMatch(/^SUB-/);
    expect(all[1].customerAddress).toContain("99 New Road");
  });
});
