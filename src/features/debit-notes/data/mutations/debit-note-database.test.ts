/**
 * Database-backed integration tests for debit-note persistence, accounting,
 * concurrency, isolation, and authorization.
 *
 * Runs ONLY when AVENTRA_TEST_DATABASE_URL is set, pointing at an isolated
 * PostgreSQL test database with all project migrations applied
 * (`prisma migrate deploy`). Never touches production data. Without the env
 * var the suite skips, keeping the default unit run dependency-free.
 */
const TEST_DATABASE_URL = process.env.AVENTRA_TEST_DATABASE_URL;
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import { getAuthState } from "@/features/auth";
import { calculateInvoiceTotals } from "@/features/invoices";
import { createInvoiceAction } from "@/features/invoices/data/mutations/invoice-mutations";
import { createCreditNoteAction } from "@/features/credit-notes/data/mutations/credit-note-mutations";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import {
  createDebitNoteAction,
  updateDebitNoteAction,
  issueDebitNoteAction,
  deleteDebitNoteAction,
} from "./debit-note-mutations";
import { debitNoteRepository } from "../../infrastructure/repositories/prisma-debit-note-repository";
import { updateBillingSettingsAction } from "@/features/billing-settings/data/mutations/billing-settings-mutations";

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
let seq = 5000;
const unique = (prefix: string): string => `${prefix}-${Date.now()}-${(seq += 1)}`;

type SeededOrg = {
  org: { id: string; name: string; slug: string };
  owner: { id: string; name: string; email: string };
  member: { id: string; name: string; email: string };
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
  return { org, owner, member };
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

const createStandardInvoice = async (overrides: Record<string, unknown> = {}) => {
  const res = await createInvoiceAction({
    customerName: "Acme",
    customerPlaceOfSupply: "27-Maharashtra",
    issueDate: "2026-10-15",
    dueDate: "2026-10-30",
    status: "Issued",
    items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
    ...overrides,
  } as Parameters<typeof createInvoiceAction>[0]);
  expect(res.success).toBe(true);
  return res.data?.id ?? "";
};

const debitItem = (unitPrice: number) => ({
  item: "Additional service",
  quantity: 1,
  unitPrice,
  discount: 0,
  taxRate: 18,
});

describe.skipIf(!TEST_DATABASE_URL)("debit note database integration", () => {
  // NOTE: no table truncation here. Database suites run in parallel workers
  // against one isolated test database, so destructive cleanup would race.
  // Every test seeds its own uniquely-suffixed organization and asserts only
  // rows scoped to it.
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("persists a debit note and reloads identical totals with a DN- number", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const invoiceId = await createStandardInvoice();

    const res = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Under-billing correction",
      items: [debitItem(1000)],
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.debitNoteNumber).toMatch(/^DN-/);
    expect(res.data.total).toBe(1180);

    const reloaded = await debitNoteRepository.findById(seeded.org.id, res.data.id);
    expect(reloaded?.debitNoteNumber).toBe(res.data.debitNoteNumber);
    expect(reloaded?.total).toBe(1180);
    expect(reloaded?.status).toBe("Draft");
  });

  it("increases the receivable on issuance without marking PAID or touching amountPaid", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await createStandardInvoice();

    const res = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Additional charges",
      items: [debitItem(1000)],
    });
    expect(res.success).toBe(true);

    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    expect(reloaded).not.toBeNull();
    const totals = calculateInvoiceTotals(reloaded ?? { items: [], amountPaid: 0 });
    expect(totals.total).toBe(11800);
    expect(totals.debitedAmount ?? 0).toBe(1180);
    // 11,800 + 1,180 debit, zero cash, zero credits.
    expect(totals.balance).toBe(12980);

    const raw = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(Number(raw?.amountPaid)).toBe(0);
    expect(raw?.status).not.toBe(PrismaInvoiceStatus.PAID);
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
  });

  it("derives Partially Paid when a debit raises a paid invoice's balance", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await createStandardInvoice({ amountPaid: 11800 });

    const res = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Price revision",
      items: [debitItem(1000)],
    });
    expect(res.success).toBe(true);

    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    const totals = calculateInvoiceTotals(reloaded ?? { items: [], amountPaid: 0 });
    expect(totals.balance).toBe(1180);

    const raw = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(Number(raw?.amountPaid)).toBe(11800);
    expect(raw?.status).toBe(PrismaInvoiceStatus.PARTIALLY_PAID);
  });

  it("combines credits and debits honestly in one balance", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const invoiceId = await createStandardInvoice();

    const cn = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Partial return",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(cn.success).toBe(true);

    const dn = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Additional work",
      items: [debitItem(2000)],
    });
    expect(dn.success).toBe(true);

    // 11,800 − 1,180 credit + 2,360 debit = 12,980, zero cash → stays Issued.
    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    const totals = calculateInvoiceTotals(reloaded ?? { items: [], amountPaid: 0 });
    expect(totals.balance).toBe(12980);
    const raw = await getPrisma().invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
  });

  it("drafts have no financial effect and failed issuance rolls back fully", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await createStandardInvoice();

    const draft = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Pending review",
      items: [debitItem(1000)],
    });
    expect(draft.success).toBe(true);
    expect(await prisma.debitNote.count({ where: { invoiceId, status: "ISSUED" } })).toBe(0);

    const settingsBefore = await prisma.billingSettings.findMany({
      where: { organizationId: seeded.org.id },
    });
    const over = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Over-debit attempt",
      items: [debitItem(50000)],
    });
    expect(over.success).toBe(false);
    expect(await prisma.debitNote.count({ where: { invoiceId } })).toBe(1);
    const raw = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
    const settingsAfter = await prisma.billingSettings.findMany({
      where: { organizationId: seeded.org.id },
    });
    expect(settingsAfter.map((s) => s.nextNumber)).toEqual(settingsBefore.map((s) => s.nextNumber));
  });

  it("caps concurrent debits at the gross invoice total", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await createStandardInvoice();
    // Invoice total is 11,800; each debit below is 5,900 — at most 2 may succeed.

    const attempts = await Promise.allSettled(
      [1, 2, 3, 4].map(() =>
        createDebitNoteAction({
          invoiceId,
          issueDate: "2026-10-15",
          status: "Issued",
          reason: "Concurrent debit race",
          items: [debitItem(5000)],
        }),
      ),
    );
    const succeeded = attempts.filter(
      (a) => a.status === "fulfilled" && a.value.success,
    ).length;
    expect(succeeded).toBe(2);

    const issuedSum = await prisma.debitNote.aggregate({
      where: { invoiceId, status: "ISSUED" },
      _sum: { total: true },
    });
    expect(Number(issuedSum._sum.total ?? 0)).toBe(11800);
  });

  it("applies a retried issuance exactly once", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await createStandardInvoice();

    const draft = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Retry probe",
      items: [debitItem(1000)],
    });
    expect(draft.success).toBe(true);
    const draftId = draft.success ? draft.data.id : "";

    const [first, second] = await Promise.all([
      issueDebitNoteAction(draftId),
      issueDebitNoteAction(draftId),
    ]);
    expect([first, second].filter((r) => r.success)).toHaveLength(1);

    expect(await prisma.debitNote.count({ where: { invoiceId, status: "ISSUED" } })).toBe(1);
    const issued = await debitNoteRepository.getIssuedTotalForInvoice(seeded.org.id, invoiceId);
    expect(issued).toBe(1180);
  });

  it("settles through the draft-to-issued update path", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const invoiceId = await createStandardInvoice();

    const draft = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Update-path probe",
      items: [debitItem(1000)],
    });
    expect(draft.success).toBe(true);
    const draftId = draft.success ? draft.data.id : "";

    const updated = await updateDebitNoteAction({
      id: draftId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Update-path probe",
      items: [debitItem(1000)],
    });
    expect(updated.success).toBe(true);

    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    const totals = calculateInvoiceTotals(reloaded ?? { items: [], amountPaid: 0 });
    expect(totals.balance).toBe(12980);
  });

  it("enforces organization isolation for reads and references", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();
    authAs(orgA, "owner");
    const invoiceId = await createStandardInvoice();

    authAs(orgB, "owner");
    expect(await debitNoteRepository.findById(orgB.org.id, "dn-none")).toBeNull();
    const cross = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Cross-org attempt",
      items: [debitItem(100)],
    });
    expect(cross.success).toBe(false);
    expect(await getPrisma().debitNote.count({ where: { invoiceId } })).toBe(0);
  });

  it("enforces owner/admin checks for issuance, deletion, and forged drafts", async () => {
    const seeded = await seedOrg();
    const prisma = getPrisma();
    authAs(seeded, "owner");
    const invoiceId = await createStandardInvoice();

    authAs(seeded, "member");
    const deniedIssue = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Member attempt",
      items: [debitItem(100)],
    });
    expect(deniedIssue.success).toBe(false);
    expect(await prisma.debitNote.count({ where: { invoiceId } })).toBe(0);

    authAs(seeded, "owner");
    const draft = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Member-delete probe",
      items: [debitItem(100)],
    });
    expect(draft.success).toBe(true);
    const draftId = draft.success ? draft.data.id : "";

    authAs(seeded, "member");
    const deniedDelete = await deleteDebitNoteAction(draftId);
    expect(deniedDelete.success).toBe(false);
    expect(await prisma.debitNote.count({ where: { id: draftId } })).toBe(1);

    authAs(seeded, "owner");
    expect((await deleteDebitNoteAction(draftId)).success).toBe(true);
    expect(await prisma.debitNote.count({ where: { id: draftId } })).toBe(0);
  });

  it("numbers created debit notes with the organization's configured prefix", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const saved = await updateBillingSettingsAction({
      documentType: "DEBIT_NOTE",
      prefix: "DNB-",
      padding: 4,
    });
    expect(saved.success).toBe(true);

    const invoiceId = await createStandardInvoice();
    const res = await createDebitNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Prefix probe",
      items: [debitItem(1000)],
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.debitNoteNumber).toMatch(/^DNB-/);
    expect(res.data.debitNoteNumber).toBe("DNB-0001");
  });
});
