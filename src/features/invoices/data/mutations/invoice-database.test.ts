/**
 * Database-backed integration tests for invoice persistence, accounting,
 * concurrency, isolation, and authorization (final verification).
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
import { createInvoiceAction, deleteInvoiceAction } from "./invoice-mutations";
import { createCreditNoteAction } from "@/features/credit-notes/data/mutations/credit-note-mutations";
import { updateBillingSettingsAction } from "@/features/billing-settings/data/mutations/billing-settings-mutations";
import { invoiceRepository } from "../../infrastructure/repositories/prisma-invoice-repository";
import { calculateInvoiceTotals } from "../../domain/invoice";

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
let seq = 0;
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
    data: {
      organizationId: org.id,
      gstNumber: "27AABCG9912D1Z9",
      panNumber: "AABCG9912D",
    },
  });
  return { org, owner, member };
};

const authAs = (
  seeded: SeededOrg,
  who: "owner" | "member",
): void => {
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

describe.skipIf(!TEST_DATABASE_URL)("invoice database integration", () => {
  // NOTE: no table truncation here. Both database suites run in parallel
  // workers against one isolated test database, so destructive cleanup would
  // race. Every test seeds its own uniquely-suffixed organization and asserts
  // only rows scoped to it; the throwaway test database is never reused for
  // anything else.
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("persists an invoice and reloads identical totals and numbering", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const res = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Service", quantity: 2, unitPrice: 5000, discount: 0, taxRate: 18 }],
    });
    expect(res.success).toBe(true);
    expect(res.data?.number).toMatch(/^INV-/);

    const reloaded = await invoiceRepository.findById(seeded.org.id, res.data?.id ?? "");
    expect(reloaded?.number).toBe(res.data?.number);
    // 2 × 5000 = 10000 taxable, 18% = 1800 tax, total 11800.
    expect(reloaded ? calculateInvoiceTotals(reloaded).total : NaN).toBe(11800);
    expect(Number(reloaded?.amountPaid)).toBe(0);

    const raw = await getPrisma().invoice.findUnique({ where: { id: res.data?.id ?? "" } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
    expect(Number(raw?.total)).toBe(11800);
  });

  it("keeps ₹8,000 outstanding and NOT PAID for a ₹10,000 invoice with ₹0 cash and a ₹2,000 issued credit", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const inv = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Hardware", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 0 }],
    });
    expect(inv.success).toBe(true);
    const invoiceId = inv.data?.id ?? "";

    const cn = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Billing correction",
      items: [{ item: "Hardware", quantity: 1, unitPrice: 2000, discount: 0, taxRate: 0 }],
    });
    expect(cn.success).toBe(true);

    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    expect(reloaded).not.toBeNull();
    const totals = calculateInvoiceTotals(reloaded ?? { items: [], amountPaid: 0 });
    expect(totals.total).toBe(10000);
    expect(totals.creditedAmount ?? 0).toBe(2000);
    expect(totals.balance).toBe(8000);

    const raw = await getPrisma().invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).not.toBe(PrismaInvoiceStatus.PAID);
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
  });

  it("draft credit notes do not affect receivables", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const inv = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Hardware", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 0 }],
    });
    const invoiceId = inv.data?.id ?? "";

    const draft = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Pending review",
      items: [{ item: "Hardware", quantity: 1, unitPrice: 2000, discount: 0, taxRate: 0 }],
    });
    expect(draft.success).toBe(true);

    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    expect(Number(reloaded?.creditedAmount ?? 0)).toBe(0);
    const raw = await getPrisma().invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
  });

  it("leaves no partial writes when issuance fails the credit limit", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const inv = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
    });
    const invoiceId = inv.data?.id ?? "";
    const settingsBefore = await prisma.billingSettings.findMany({ where: { organizationId: seeded.org.id } });

    const over = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Over-credit attempt",
      items: [{ item: "Service", quantity: 10, unitPrice: 10000, discount: 0, taxRate: 18 }],
    });
    expect(over.success).toBe(false);

    expect(await prisma.creditNote.count({ where: { invoiceId } })).toBe(0);
    const raw = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
    const settingsAfter = await prisma.billingSettings.findMany({ where: { organizationId: seeded.org.id } });
    expect(settingsAfter.map((s) => s.nextNumber)).toEqual(settingsBefore.map((s) => s.nextNumber));
  });

  it("prevents concurrent over-crediting under real row locks", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const inv = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
    });
    const invoiceId = inv.data?.id ?? "";
    // Invoice total is 11,800; each credit below is 5,900 — at most 2 may succeed.

    const attempts = await Promise.allSettled(
      [1, 2, 3, 4, 5].map(() =>
        createCreditNoteAction({
          invoiceId,
          issueDate: "2026-10-15",
          status: "Issued",
          reason: "Concurrent credit race",
          items: [{ item: "Service", quantity: 1, unitPrice: 5000, discount: 0, taxRate: 18 }],
        }),
      ),
    );
    const succeeded = attempts.filter(
      (a) => a.status === "fulfilled" && a.value.success,
    ).length;
    expect(succeeded).toBe(2);

    const issuedSum = await prisma.creditNote.aggregate({
      where: { invoiceId, status: "ISSUED" },
      _sum: { total: true },
    });
    expect(Number(issuedSum._sum.total ?? 0)).toBe(11800);
  });

  it("allocates unique invoice numbers under concurrency", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createInvoiceAction({
          customerName: `Customer ${i}`,
          customerPlaceOfSupply: "27-Maharashtra",
          issueDate: "2026-10-15",
          dueDate: "2026-10-30",
          status: "Draft",
          items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
        }),
      ),
    );
    expect(results.every((r) => r.success)).toBe(true);
    const numbers = results.map((r) => r.data?.number ?? "");
    expect(new Set(numbers).size).toBe(10);
  });

  it("enforces organization isolation at the database boundary", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();
    authAs(orgA, "owner");

    const inv = await createInvoiceAction({
      customerName: "Acme A",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    const invoiceId = inv.data?.id ?? "";

    authAs(orgB, "owner");
    expect(await invoiceRepository.findById(orgB.org.id, invoiceId)).toBeNull();
    const cross = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Cross-org attempt",
      items: [{ item: "Service", quantity: 1, unitPrice: 100, discount: 0, taxRate: 0 }],
    });
    expect(cross.success).toBe(false);
    expect(await getPrisma().creditNote.count({ where: { invoiceId } })).toBe(0);
  });

  it("enforces owner/admin checks for issuance, deletion, forgery, and overpayment", async () => {
    const seeded = await seedOrg();
    const prisma = getPrisma();

    // Member cannot issue.
    authAs(seeded, "member");
    const denied = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    expect(denied.success).toBe(false);
    expect(await prisma.invoice.count({ where: { organizationId: seeded.org.id } })).toBe(0);

    // Owner can issue; member cannot delete it.
    authAs(seeded, "owner");
    const draft = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Draft",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    expect(draft.success).toBe(true);
    const draftId = draft.data?.id ?? "";

    authAs(seeded, "member");
    const delDenied = await deleteInvoiceAction(draftId);
    expect(delDenied.success).toBe(false);
    expect(await prisma.invoice.count({ where: { id: draftId } })).toBe(1);

    // Forged Paid status and overpayment are rejected with nothing persisted.
    authAs(seeded, "owner");
    const forged = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Paid",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    expect(forged.success).toBe(false);
    const overpaid = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Draft",
      amountPaid: 99999,
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    expect(overpaid.success).toBe(false);
    expect(await prisma.invoice.count({ where: { organizationId: seeded.org.id } })).toBe(1);

    // Owner can delete the draft.
    const delOk = await deleteInvoiceAction(draftId);
    expect(delOk.success).toBe(true);
    expect(await prisma.invoice.count({ where: { id: draftId } })).toBe(0);
  });

  it("numbers created invoices with the organization's configured prefix", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const saved = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "ACME-",
      padding: 4,
    });
    expect(saved.success).toBe(true);

    const res = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    expect(res.success).toBe(true);
    expect(res.data?.number).toMatch(/^ACME-/);
    expect(res.data?.number).toBe("ACME-0001");
  });
});
