/**
 * Database-backed integration tests for Purchase Return persistence,
 * totals, remaining-quantity enforcement, isolation, lifecycle, and Purchase
 * Settings integration.
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
  createPurchaseReturnAction,
  updatePurchaseReturnStatusAction,
  deletePurchaseReturnAction,
} from "./purchase-return-mutations";
import { purchaseReturnRepository } from "../../infrastructure/repositories/prisma-purchase-return-repository";
import { purchaseSettingsRepository } from "@/features/purchase-settings/infrastructure/repositories/prisma-purchase-settings-repository";

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
  bill: { id: string; number: string; itemId: string };
};

const seedOrg = async (): Promise<SeededOrg> => {
  const prisma = getPrisma();
  const tag = unique("prt");
  const org = { id: `org_${tag}`, name: `Test Org ${tag}`, slug: `test-org-${tag}` };
  const owner = { id: `user_owner_${tag}`, name: "Owner", email: `owner-${tag}@example.com` };
  const supplierId = `sup_${tag}`;
  const billId = `pb_${tag}`;
  const billItemId = `pbi_${tag}`;
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
            id: billItemId,
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
    bill: { id: billId, number: `PB-${tag}`, itemId: billItemId },
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

suite("Purchase Returns Database Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });

  it("persists a Purchase Return, calculates exact totals, and allocates the configured PR- sequence number", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const result = await createPurchaseReturnAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      purchaseBillId: seeded.bill.id,
      returnDate: "2026-10-14",
      reason: "Defective or damaged in transit",
      items: [
        {
          purchaseBillItemId: seeded.bill.itemId,
          item: "Steel Rods",
          billedQuantity: 10,
          returnQuantity: 4,
          unitPrice: 100,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const purchaseReturn = result.data!;
    expect(purchaseReturn.returnNumber).toMatch(/^PR-\d{4}/);
    expect(purchaseReturn.purchaseBillNumber).toBe(seeded.bill.number);
    expect(purchaseReturn.subtotal).toBe(400);
    expect(purchaseReturn.taxAmount).toBe(72);
    expect(purchaseReturn.totalAmount).toBe(472);
  });

  it("enforces remaining quantities across sequential returns", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const base = {
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      purchaseBillId: seeded.bill.id,
      returnDate: "2026-10-14",
      reason: "Defective or damaged in transit",
    };
    const line = (returnQuantity: number) => ({
      purchaseBillItemId: seeded.bill.itemId,
      item: "Steel Rods",
      billedQuantity: 10,
      returnQuantity,
      unitPrice: 100,
    });

    const first = await createPurchaseReturnAction({
      ...base,
      items: [line(4)],
    });
    expect(first.success).toBe(true);

    // Only 6 remain: returning 7 must fail atomically.
    const over = await createPurchaseReturnAction({
      ...base,
      items: [line(7)],
    });
    expect(over.success).toBe(false);
    expect(over.error).toContain("remaining returnable quantity");

    const second = await createPurchaseReturnAction({
      ...base,
      items: [line(6)],
    });
    expect(second.success).toBe(true);

    // Nothing remains: any further return fails.
    const third = await createPurchaseReturnAction({
      ...base,
      items: [line(1)],
    });
    expect(third.success).toBe(false);
  });

  it("applies configured return numbering and defaults without renumbering history", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    await purchaseSettingsRepository.saveSettings(seeded.org.id, {
      purchaseReturnPrefix: "RET/",
      purchaseReturnNextNumber: 7,
      purchaseReturnPadding: 5,
      defaultPurchaseReturnReason: "Wrong item shipped",
      defaultPurchaseReturnNotes: "Arrange pickup.",
    });

    const result = await createPurchaseReturnAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      purchaseBillId: seeded.bill.id,
      returnDate: "2026-10-14",
      reason: "Wrong item shipped",
      items: [
        {
          purchaseBillItemId: seeded.bill.itemId,
          item: "Steel Rods",
          billedQuantity: 10,
          returnQuantity: 1,
          unitPrice: 100,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data!.returnNumber).toBe("RET/00007");
    expect(result.data!.notes).toBe("Arrange pickup.");

    await purchaseSettingsRepository.saveSettings(seeded.org.id, {
      purchaseReturnPrefix: "PR-X-",
    });
    const reloaded = await purchaseReturnRepository.findById(
      seeded.org.id,
      result.data!.id,
    );
    expect(reloaded?.returnNumber).toBe("RET/00007");
  });

  it("rejects returns against draft bills and foreign bills", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const prisma = getPrisma();
    await prisma.purchaseBill.update({
      where: { id: seeded.bill.id },
      data: { status: "DRAFT" },
    });

    const draftResult = await createPurchaseReturnAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      purchaseBillId: seeded.bill.id,
      returnDate: "2026-10-14",
      reason: "Damaged",
      items: [
        {
          purchaseBillItemId: seeded.bill.itemId,
          item: "Steel Rods",
          billedQuantity: 10,
          returnQuantity: 1,
          unitPrice: 100,
        },
      ],
    });
    expect(draftResult.success).toBe(false);
    expect(draftResult.error).toContain("only Confirmed bills");

    const orgB = await seedOrg();
    asOwner(orgB);
    const foreignResult = await createPurchaseReturnAction({
      supplierId: orgB.supplier.id,
      supplierName: orgB.supplier.name,
      purchaseBillId: seeded.bill.id,
      returnDate: "2026-10-14",
      reason: "Damaged",
      items: [
        {
          purchaseBillItemId: seeded.bill.itemId,
          item: "Steel Rods",
          billedQuantity: 10,
          returnQuantity: 1,
          unitPrice: 100,
        },
      ],
    });
    expect(foreignResult.success).toBe(false);
    expect(foreignResult.error).toContain("not found in this organization");
  });

  it("moves through Draft → Approved → Completed and guards terminal states", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const created = await createPurchaseReturnAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      purchaseBillId: seeded.bill.id,
      returnDate: "2026-10-14",
      reason: "Damaged",
      items: [
        {
          purchaseBillItemId: seeded.bill.itemId,
          item: "Steel Rods",
          billedQuantity: 10,
          returnQuantity: 2,
          unitPrice: 100,
        },
      ],
    });
    expect(created.success).toBe(true);
    expect(created.data!.status).toBe("DRAFT");

    const approved = await updatePurchaseReturnStatusAction(created.data!.id, {
      status: "APPROVED",
    });
    expect(approved.success).toBe(true);

    const completed = await updatePurchaseReturnStatusAction(
      created.data!.id,
      { status: "COMPLETED" },
    );
    expect(completed.success).toBe(true);
    expect(completed.data!.status).toBe("COMPLETED");

    const reopened = await updatePurchaseReturnStatusAction(
      created.data!.id,
      { status: "APPROVED" },
    );
    expect(reopened.success).toBe(false);

    const deleted = await deletePurchaseReturnAction(created.data!.id);
    expect(deleted.success).toBe(false);
  });
});
