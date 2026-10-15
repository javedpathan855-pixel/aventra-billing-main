/**
 * Database-backed integration tests for invoice status management (Phase 1):
 * dedicated issue/cancel transitions, concurrency safety, overdue display,
 * cancellation guards, and authorization — all against real PostgreSQL.
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
import {
  calculateInvoiceTotals,
  resolveInvoiceDisplayStatus,
} from "../../domain/invoice";
import {
  cancelInvoiceAction,
  createInvoiceAction,
  deleteInvoiceAction,
  issueInvoiceAction,
} from "./invoice-mutations";
import { createCreditNoteAction } from "@/features/credit-notes/data/mutations/credit-note-mutations";
import { invoiceRepository } from "../../infrastructure/repositories/prisma-invoice-repository";

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
let seq = 3000;
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

const draftInput = {
  customerName: "Acme",
  customerPlaceOfSupply: "27-Maharashtra",
  issueDate: "2026-10-15",
  dueDate: "2026-10-30",
  status: "Draft" as const,
  items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
};

describe.skipIf(!TEST_DATABASE_URL)("invoice status database integration", () => {
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

  it("issues a draft through the dedicated path with totals intact", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const created = await createInvoiceAction(draftInput);
    expect(created.success).toBe(true);
    const id = created.data?.id ?? "";

    const issued = await issueInvoiceAction(id);
    expect(issued.success).toBe(true);

    const raw = await prisma.invoice.findUnique({ where: { id } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
    expect(Number(raw?.total)).toBe(11800);
    expect(Number(raw?.amountPaid)).toBe(0);
  });

  it("lets exactly one concurrent issuance win", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const created = await createInvoiceAction(draftInput);
    const id = created.data?.id ?? "";

    const [a, b] = await Promise.all([issueInvoiceAction(id), issueInvoiceAction(id)]);
    const successes = [a, b].filter((r) => r.success).length;
    expect(successes).toBe(1);

    const raw = await prisma.invoice.findUnique({ where: { id } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
  });

  it("cancels a clean issued invoice and then rejects every further transition", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const created = await createInvoiceAction({ ...draftInput, status: "Issued" });
    const id = created.data?.id ?? "";

    const cancelled = await cancelInvoiceAction(id);
    expect(cancelled.success).toBe(true);

    const raw = await prisma.invoice.findUnique({ where: { id } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.CANCELLED);

    // Terminal: no reissue, no second cancel, no edit, no delete.
    expect((await cancelInvoiceAction(id)).success).toBe(false);
    expect((await issueInvoiceAction(id)).success).toBe(false);
    expect((await deleteInvoiceAction(id)).success).toBe(false);
    const reloaded = await invoiceRepository.findById(seeded.org.id, id);
    expect(reloaded?.status).toBe("Cancelled");
  });

  it("refuses cancellation once money has moved", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    // Case 1: issued credit note blocks cancellation.
    const withCredit = await createInvoiceAction({ ...draftInput, status: "Issued" });
    const creditId = withCredit.data?.id ?? "";
    const cn = await createCreditNoteAction({
      invoiceId: creditId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Partial return",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(cn.success).toBe(true);
    const refusedCredit = await cancelInvoiceAction(creditId);
    expect(refusedCredit.success).toBe(false);
    expect(refusedCredit.error).toContain("credit notes");
    expect((await prisma.invoice.findUnique({ where: { id: creditId } }))?.status).toBe(
      PrismaInvoiceStatus.ISSUED,
    );

    // Case 2: recorded cash blocks cancellation.
    const withCash = await createInvoiceAction({
      ...draftInput,
      status: "Issued",
      amountPaid: 11800,
    });
    const cashId = withCash.data?.id ?? "";
    const refusedCash = await cancelInvoiceAction(cashId);
    expect(refusedCash.success).toBe(false);
    expect(refusedCash.error).toContain("cash payments");
  });

  it("derives Overdue for past-due unpaid invoices without rewriting stored status", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const created = await createInvoiceAction({
      ...draftInput,
      status: "Issued",
      issueDate: "2020-01-01",
      dueDate: "2020-01-15",
    });
    const id = created.data?.id ?? "";

    const reloaded = await invoiceRepository.findById(seeded.org.id, id);
    expect(reloaded).not.toBeNull();
    const totals = calculateInvoiceTotals(reloaded ?? { items: [], amountPaid: 0 });
    expect(
      resolveInvoiceDisplayStatus({
        status: reloaded?.status ?? "Issued",
        total: totals.total,
        amountPaid: Number(reloaded?.amountPaid ?? 0),
        creditedAmount: totals.creditedAmount ?? 0,
        debitedAmount: totals.debitedAmount ?? 0,
        dueDate: reloaded?.dueDate ?? "",
        today: "2026-12-31",
      }),
    ).toBe("Overdue");

    // Stored status is untouched — Overdue is derived, not transitioned.
    expect((await prisma.invoice.findUnique({ where: { id } }))?.status).toBe(
      PrismaInvoiceStatus.ISSUED,
    );
  });

  it("rejects forged paid status at creation with nothing persisted", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const forged = await createInvoiceAction({ ...draftInput, status: "Paid" });
    expect(forged.success).toBe(false);
    expect(await prisma.invoice.count({ where: { organizationId: seeded.org.id } })).toBe(0);
  });

  it("denies issue and cancel to members and foreign organizations", async () => {
    const seeded = await seedOrg();
    const foreign = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const created = await createInvoiceAction(draftInput);
    const id = created.data?.id ?? "";

    authAs(seeded, "member");
    expect((await issueInvoiceAction(id)).success).toBe(false);
    expect((await cancelInvoiceAction(id)).success).toBe(false);
    expect((await prisma.invoice.findUnique({ where: { id } }))?.status).toBe(
      PrismaInvoiceStatus.DRAFT,
    );

    authAs(foreign, "owner");
    expect((await issueInvoiceAction(id)).success).toBe(false);
    expect((await prisma.invoice.findUnique({ where: { id } }))?.status).toBe(
      PrismaInvoiceStatus.DRAFT,
    );
  });
});
