/**
 * Database-backed integration tests for Payments Received (Phase 2):
 * recording, multi-invoice allocation, status derivation, credit interplay,
 * overpayment policy, idempotency, concurrency, rollback, isolation,
 * reversals, legacy amountPaid coexistence, and cancellation guards —
 * all against real PostgreSQL.
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
} from "@/features/invoices";
import { createInvoiceAction } from "@/features/invoices/data/mutations/invoice-mutations";
import { cancelInvoiceAction } from "@/features/invoices/data/mutations/invoice-mutations";
import { createCreditNoteAction } from "@/features/credit-notes/data/mutations/credit-note-mutations";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import {
  recordPaymentAction,
  reversePaymentAction,
} from "@/features/payments/data/mutations/payment-mutations";

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
let seq = 8000;
const unique = (prefix: string): string => `${prefix}-${Date.now()}-${(seq += 1)}`;

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

const pastDate = (): string => new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

const invoiceInput = {
  customerName: "Acme",
  customerPlaceOfSupply: "27-Maharashtra",
  issueDate: "2026-10-15",
  dueDate: "2026-10-30",
  status: "Issued" as const,
  items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 0 }],
};

const create10kInvoice = async (customerId?: string) => {
  const res = await createInvoiceAction({ ...invoiceInput, customerId });
  expect(res.success).toBe(true);
  return res.data?.id ?? "";
};

const displayOf = async (orgId: string, invoiceId: string, today = "2026-10-15") => {
  const reloaded = await invoiceRepository.findById(orgId, invoiceId);
  if (!reloaded) throw new Error("invoice missing in test");
  const totals = calculateInvoiceTotals(reloaded);
  return {
    totals,
    status: resolveInvoiceDisplayStatus({
      status: reloaded.status,
      total: totals.total,
      amountPaid: Number(reloaded.amountPaid),
      allocatedCash: totals.allocatedCash ?? 0,
      creditedAmount: totals.creditedAmount ?? 0,
      debitedAmount: totals.debitedAmount ?? 0,
      dueDate: reloaded.dueDate,
      today,
    }),
  };
};

describe.skipIf(!TEST_DATABASE_URL)("payments received database integration", () => {
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

  it("Case A — partial payment leaves ₹6,000 outstanding and Partially Paid", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const invoiceId = await create10kInvoice(seeded.customerId);

    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 4000,
      paymentDate: pastDate(),
      method: "UPI",
      reference: "UPI-A-001",
      allocations: [{ invoiceId, amount: 4000 }],
    });
    expect(res.success).toBe(true);

    const { totals, status } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(6000);
    expect(status).toBe("Partially Paid");
    const raw = await getPrisma().invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.PARTIALLY_PAID);
  });

  it("Case B — full payment leaves ₹0 outstanding and Paid", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const invoiceId = await create10kInvoice(seeded.customerId);

    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 10000,
      paymentDate: pastDate(),
      method: "Bank Transfer",
      allocations: [{ invoiceId, amount: 10000 }],
    });
    expect(res.success).toBe(true);

    const { totals, status } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(0);
    expect(status).toBe("Paid");
  });

  it("Case C — credit note alone leaves ₹8,000 and never Paid", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const invoiceId = await create10kInvoice(seeded.customerId);

    const cn = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Partial return",
      items: [{ item: "Service", quantity: 1, unitPrice: 2000, discount: 0, taxRate: 0 }],
    });
    expect(cn.success).toBe(true);

    const { totals, status } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(8000);
    expect(status).not.toBe("Paid");
  });

  it("Case D — ₹8,000 cash after a ₹2,000 credit settles the invoice", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const invoiceId = await create10kInvoice(seeded.customerId);

    const cn = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Partial return",
      items: [{ item: "Service", quantity: 1, unitPrice: 2000, discount: 0, taxRate: 0 }],
    });
    expect(cn.success).toBe(true);

    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 8000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 8000 }],
    });
    expect(res.success).toBe(true);

    const { totals, status } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(0);
    expect(status).toBe("Paid");
  });

  it("Case E — reversal restores the balance and recalculates status with history intact", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await create10kInvoice(seeded.customerId);

    const recorded = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 10000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 10000 }],
    });
    expect(recorded.success).toBe(true);
    const paymentId = recorded.success ? recorded.data.id : "";

    const reversed = await reversePaymentAction({ id: paymentId, reason: "Cheque bounced" });
    expect(reversed.success).toBe(true);

    const { totals, status } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(10000);
    expect(status).toBe("Issued");

    // History preserved: original row exists as Reversed with its allocations.
    const rows = await prisma.payment.findMany({
      where: { organizationId: seeded.org.id },
      include: { allocations: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("REVERSED");
    expect(rows[0].reversalReason).toBe("Cheque bounced");
    expect(rows[0].allocations).toHaveLength(1);

    // Double reversal is rejected; balances stay put.
    const again = await reversePaymentAction({ id: paymentId });
    expect(again.success).toBe(false);
    const after = await displayOf(seeded.org.id, invoiceId);
    expect(after.totals.balance).toBe(10000);
  });

  it("Case F — overpayment is rejected with nothing persisted", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await create10kInvoice(seeded.customerId);

    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 12000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 12000 }],
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("outstanding balance");
    expect(await prisma.payment.count({ where: { organizationId: seeded.org.id } })).toBe(0);
    expect(await prisma.paymentAllocation.count({ where: { organizationId: seeded.org.id } })).toBe(0);
    const { totals } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(10000);
  });

  it("allocates one payment across multiple invoices", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const first = await create10kInvoice(seeded.customerId);
    const second = await create10kInvoice(seeded.customerId);

    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 15000,
      paymentDate: pastDate(),
      method: "Bank Transfer",
      allocations: [
        { invoiceId: first, amount: 10000 },
        { invoiceId: second, amount: 5000 },
      ],
    });
    expect(res.success).toBe(true);

    expect((await displayOf(seeded.org.id, first)).status).toBe("Paid");
    const partial = await displayOf(seeded.org.id, second);
    expect(partial.totals.balance).toBe(5000);
    expect(partial.status).toBe("Partially Paid");
  });

  it("returns the original record on duplicate submission", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await create10kInvoice(seeded.customerId);
    const payload = {
      customerId: seeded.customerId,
      amount: 4000,
      paymentDate: pastDate(),
      method: "UPI" as const,
      idempotencyKey: `key-${unique("k")}`,
      allocations: [{ invoiceId, amount: 4000 }],
    };

    const first = await recordPaymentAction(payload);
    const second = await recordPaymentAction(payload);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(second.data.id).toBe(first.data.id);
    }
    expect(
      await prisma.payment.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(1);
    expect(
      await prisma.paymentAllocation.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(1);
  });

  it("lets exactly one concurrent allocator win the same balance", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await create10kInvoice(seeded.customerId);

    const attempt = (tag: string) =>
      recordPaymentAction({
        customerId: seeded.customerId,
        amount: 8000,
        paymentDate: pastDate(),
        method: "Cash",
        idempotencyKey: `race-${tag}-${unique("k")}`,
        allocations: [{ invoiceId, amount: 8000 }],
      });
    const [a, b] = await Promise.all([attempt("a"), attempt("b")]);

    expect([a.success, b.success].filter(Boolean)).toHaveLength(1);
    const allocated = await prisma.paymentAllocation.aggregate({
      where: { organizationId: seeded.org.id },
      _sum: { amount: true },
    });
    expect(Number(allocated._sum.amount ?? 0)).toBe(8000);
    const { totals } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(2000);
  });

  it("rolls back everything when an allocation fails mid-payment", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const first = await create10kInvoice(seeded.customerId);
    const second = await create10kInvoice(seeded.customerId);

    // Pre-allocate 9,000 of the second invoice so only 1,000 remains.
    const prior = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 9000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId: second, amount: 9000 }],
    });
    expect(prior.success).toBe(true);

    // Totals match (10,000), the first allocation is valid, but the second
    // exceeds its remaining 1,000 — the whole payment must abort atomically.
    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 10000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [
        { invoiceId: first, amount: 5000 },
        { invoiceId: second, amount: 5000 },
      ],
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("outstanding balance");

    expect(
      await prisma.payment.count({ where: { organizationId: seeded.org.id } }),
    ).toBe(1);
    expect(
      await prisma.paymentAllocation.count({
        where: { organizationId: seeded.org.id, invoiceId: first },
      }),
    ).toBe(0);
    const untouched = await displayOf(seeded.org.id, first);
    expect(untouched.totals.balance).toBe(10000);
  });

  it("denies cross-organization and member operations with no side effects", async () => {
    const seeded = await seedOrg();
    const foreign = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await create10kInvoice(seeded.customerId);

    authAs(seeded, "member");
    const memberRes = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 1000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 1000 }],
    });
    expect(memberRes.success).toBe(false);
    expect(await prisma.payment.count({ where: { organizationId: seeded.org.id } })).toBe(0);

    authAs(foreign, "owner");
    const foreignRes = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 1000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 1000 }],
    });
    expect(foreignRes.success).toBe(false);
    expect(await prisma.payment.count({ where: { organizationId: seeded.org.id } })).toBe(0);
  });

  it("counts legacy tender together with allocations without double-counting", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const created = await createInvoiceAction({
      customerId: seeded.customerId,
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      amountPaid: 4000,
      items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 0 }],
    });
    expect(created.success).toBe(true);
    const invoiceId = created.data?.id ?? "";

    // Legacy 4,000 + new 6,000 allocation settles the 10,000 invoice exactly.
    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 6000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 6000 }],
    });
    expect(res.success).toBe(true);
    const { totals, status } = await displayOf(seeded.org.id, invoiceId);
    expect(totals.balance).toBe(0);
    expect(status).toBe("Paid");

    // And the combined cap still holds: anything more is rejected.
    const extra = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 100,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 100 }],
    });
    expect(extra.success).toBe(false);
    expect(await prisma.payment.count({ where: { organizationId: seeded.org.id } })).toBe(1);
  });

  it("blocks cancelling an invoice with active allocations", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await create10kInvoice(seeded.customerId);

    const res = await recordPaymentAction({
      customerId: seeded.customerId,
      amount: 1000,
      paymentDate: pastDate(),
      method: "Cash",
      allocations: [{ invoiceId, amount: 1000 }],
    });
    expect(res.success).toBe(true);

    const cancelled = await cancelInvoiceAction(invoiceId);
    expect(cancelled.success).toBe(false);
    // Either the status gate (Partially Paid is not cancellable) or the
    // allocation guard denies it; both layers must refuse.
    expect(cancelled.error).toMatch(/cancel/i);
    expect((await prisma.invoice.findUnique({ where: { id: invoiceId } }))?.status).toBe(
      PrismaInvoiceStatus.PARTIALLY_PAID,
    );
  });
});
