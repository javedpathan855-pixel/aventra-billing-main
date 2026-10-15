/**
 * Database-backed integration tests for Supplier Payment recording,
 * allocation enforcement, idempotency, reversal, isolation, and outstanding
 * balance accounting.
 *
 * Runs ONLY when AVENTRA_TEST_DATABASE_URL is set, pointing at an isolated
 * PostgreSQL test database with all project migrations applied.
 */
const TEST_DATABASE_URL = process.env.AVENTRA_TEST_DATABASE_URL;
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { getPrisma } from "@/shared/lib/prisma";
import { getAuthState } from "@/features/auth";
import {
  recordSupplierPaymentAction,
  reverseSupplierPaymentAction,
} from "./supplier-payment-mutations";
import { supplierPaymentRepository } from "../../infrastructure/repositories/prisma-supplier-payment-repository";
import { getPayableBills } from "../queries/get-payable-bills";

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
  supplier: { id: string; name: string };
  bill: { id: string; number: string };
};

const seedOrg = async (): Promise<SeededOrg> => {
  const prisma = getPrisma();
  const tag = unique("spay");
  const org = { id: `org_${tag}`, name: `Test Org ${tag}`, slug: `test-org-${tag}` };
  const owner = { id: `user_owner_${tag}`, name: "Owner", email: `owner-${tag}@example.com` };
  const supplierId = `sup_${tag}`;
  const billId = `pb_${tag}`;
  const now = new Date();

  await prisma.organization.create({ data: { id: org.id, name: org.name, slug: org.slug, createdAt: now } });
  await prisma.user.create({
    data: { id: owner.id, name: owner.name, email: owner.email, createdAt: now, updatedAt: now },
  });
  await prisma.member.create({
    data: { id: `mem_${tag}`, organizationId: org.id, userId: owner.id, role: "owner", createdAt: now },
  });
  await prisma.supplier.create({
    data: {
      id: supplierId,
      organizationId: org.id,
      name: `Supplier ${tag}`,
      createdAt: now,
      updatedAt: now,
    },
  });
  await prisma.purchaseBill.create({
    data: {
      id: billId,
      organizationId: org.id,
      billNumber: `PB-${tag}`,
      supplierId,
      supplierName: `Supplier ${tag}`,
      billDate: new Date("2026-10-01"),
      dueDate: new Date("2026-10-31"),
      status: "CONFIRMED",
      subtotal: 1000,
      taxableAmount: 1000,
      total: 1180,
      items: {
        create: [
          {
            id: `pbi_${tag}`,
            item: "Steel Rods",
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            taxRate: 18,
            taxableAmount: 1000,
            taxAmount: 180,
            lineTotal: 1180,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  return {
    org,
    owner,
    supplier: { id: supplierId, name: `Supplier ${tag}` },
    bill: { id: billId, number: `PB-${tag}` },
  };
};

const asOwner = (seeded: SeededOrg) => {
  mockGetAuthState.mockResolvedValue({
    status: "authenticated",
    user: { id: seeded.owner.id, name: seeded.owner.name, email: seeded.owner.email, role: "user" },
    session: { id: `sess_${Date.now()}` },
    organization: { id: seeded.org.id, name: seeded.org.name, slug: seeded.org.slug, role: "owner" },
    membership: null,
    memberships: [],
  } as unknown as Awaited<ReturnType<typeof getAuthState>>);
};

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("Supplier Payments Database Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });

  it("records a fully allocated payment and reduces the bill outstanding to zero", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const result = await recordSupplierPaymentAction({
      supplierId: seeded.supplier.id,
      amount: 1180,
      paymentDate: "2026-10-14",
      method: "Bank Transfer",
      reference: "UTR123",
      allocations: [{ purchaseBillId: seeded.bill.id, amount: 1180 }],
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.id).toMatch(/^spay_/);
    expect(result.data!.allocations).toHaveLength(1);

    const allocated =
      await supplierPaymentRepository.getActiveAllocatedTotalForBill(
        seeded.org.id,
        seeded.bill.id,
      );
    expect(allocated).toBe(1180);

    const payable = await getPayableBills({ supplierId: seeded.supplier.id });
    expect(payable.find((b) => b.id === seeded.bill.id)).toBeUndefined();
  });

  it("supports partial payments across sequential records", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const first = await recordSupplierPaymentAction({
      supplierId: seeded.supplier.id,
      amount: 500,
      paymentDate: "2026-10-14",
      allocations: [{ purchaseBillId: seeded.bill.id, amount: 500 }],
    });
    expect(first.success).toBe(true);

    const payable = await getPayableBills({ supplierId: seeded.supplier.id });
    const option = payable.find((b) => b.id === seeded.bill.id);
    expect(option?.remainingBalance).toBe(680);

    const over = await recordSupplierPaymentAction({
      supplierId: seeded.supplier.id,
      amount: 681,
      paymentDate: "2026-10-15",
      allocations: [{ purchaseBillId: seeded.bill.id, amount: 681 }],
    });
    expect(over.success).toBe(false);
    expect(over.error).toContain("outstanding balance");

    const second = await recordSupplierPaymentAction({
      supplierId: seeded.supplier.id,
      amount: 680,
      paymentDate: "2026-10-15",
      allocations: [{ purchaseBillId: seeded.bill.id, amount: 680 }],
    });
    expect(second.success).toBe(true);
  });

  it("treats repeated idempotency keys as the same payment", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const payload = {
      supplierId: seeded.supplier.id,
      amount: 1180,
      paymentDate: "2026-10-14",
      idempotencyKey: `idem-${Date.now()}`,
      allocations: [{ purchaseBillId: seeded.bill.id, amount: 1180 }],
    };

    const first = await recordSupplierPaymentAction(payload);
    expect(first.success).toBe(true);

    const second = await recordSupplierPaymentAction(payload);
    expect(second.success).toBe(true);
    expect(second.data!.id).toBe(first.data!.id);

    const allocated =
      await supplierPaymentRepository.getActiveAllocatedTotalForBill(
        seeded.org.id,
        seeded.bill.id,
      );
    expect(allocated).toBe(1180);
  });

  it("reverses a payment and restores the outstanding balance", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const recorded = await recordSupplierPaymentAction({
      supplierId: seeded.supplier.id,
      amount: 1180,
      paymentDate: "2026-10-14",
      allocations: [{ purchaseBillId: seeded.bill.id, amount: 1180 }],
    });
    expect(recorded.success).toBe(true);

    const reversed = await reverseSupplierPaymentAction({
      id: recorded.data!.id,
      reason: "Duplicate entry",
    });
    expect(reversed.success).toBe(true);
    expect(reversed.data!.status).toBe("Reversed");

    const allocated =
      await supplierPaymentRepository.getActiveAllocatedTotalForBill(
        seeded.org.id,
        seeded.bill.id,
      );
    expect(allocated).toBe(0);

    const payable = await getPayableBills({ supplierId: seeded.supplier.id });
    expect(payable.find((b) => b.id === seeded.bill.id)?.remainingBalance).toBe(
      1180,
    );

    const again = await reverseSupplierPaymentAction({
      id: recorded.data!.id,
    });
    expect(again.success).toBe(false);
  });

  it("enforces organization isolation on payments and bills", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    asOwner(orgA);
    const resultA = await recordSupplierPaymentAction({
      supplierId: orgA.supplier.id,
      amount: 1180,
      paymentDate: "2026-10-14",
      allocations: [{ purchaseBillId: orgA.bill.id, amount: 1180 }],
    });
    expect(resultA.success).toBe(true);

    asOwner(orgB);
    const foundFromB = await supplierPaymentRepository.findById(
      orgB.org.id,
      resultA.data!.id,
    );
    expect(foundFromB).toBeNull();

    const crossBill = await recordSupplierPaymentAction({
      supplierId: orgB.supplier.id,
      amount: 1180,
      paymentDate: "2026-10-14",
      allocations: [{ purchaseBillId: orgA.bill.id, amount: 1180 }],
    });
    expect(crossBill.success).toBe(false);
  });
});
