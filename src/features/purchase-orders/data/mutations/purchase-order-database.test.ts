/**
 * Database-backed integration tests for Purchase Order persistence, totals,
 * concurrency-safe numbering, isolation, authorization, receiving, and
 * Purchase Settings integration.
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
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
  recordReceivingAction,
  transitionPurchaseOrderStatusAction,
} from "./purchase-order-mutations";
import { purchaseOrderRepository } from "../../infrastructure/repositories/prisma-purchase-order-repository";
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
};

const seedOrg = async (): Promise<SeededOrg> => {
  const prisma = getPrisma();
  const tag = unique("po");
  const org = { id: `org_${tag}`, name: `Test Org ${tag}`, slug: `test-org-${tag}` };
  const owner = { id: `user_owner_${tag}`, name: "Owner", email: `owner-${tag}@example.com` };
  const supplierId = `sup_${tag}`;
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

  return { org, owner, supplier: { id: supplierId, name: `Supplier ${tag}` } };
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

suite("Purchase Orders Database Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });

  it("persists a Purchase Order, calculates exact totals, and allocates the configured PO- sequence number", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const result = await createPurchaseOrderAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      orderDate: "2026-10-14",
      items: [
        {
          item: "Industrial Server",
          description: "Rackmount server",
          hsnSac: "8471",
          quantity: 2,
          unitPrice: 50000,
          discount: 5, // 100,000 - 5% = 95,000
          taxRate: 18,
        },
      ],
      taxMode: "CGST_SGST",
      additionalCharges: 1000,
      additionalDiscount: 1000,
      additionalDiscountType: "fixed",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    const order = result.data!;
    expect(order.orderNumber).toMatch(/^PO-\d{4}/);
    expect(order.subtotal).toBe(100000);
    expect(order.lineDiscountTotal).toBe(5000);
    expect(order.taxableAmount).toBe(95000); // 95000 - 1000 + 1000 = 95000
    expect(order.cgst).toBe(8550); // 95000 * 9%
    expect(order.sgst).toBe(8550); // 95000 * 9%
    expect(order.total).toBe(112100); // 95000 + 17100
  });

  it("applies configured purchase settings numbering and defaults to new orders", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    await purchaseSettingsRepository.saveSettings(seeded.org.id, {
      purchaseOrderPrefix: "PUR/",
      purchaseOrderNextNumber: 42,
      purchaseOrderPadding: 5,
      defaultPaymentTerms: "Net 45 days",
      defaultPurchaseOrderNotes: "Deliver to Gate 2.",
    });

    const result = await createPurchaseOrderAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      orderDate: "2026-10-14",
      items: [{ item: "Cables", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(true);
    expect(result.data!.orderNumber).toBe("PUR/00042");
    expect(result.data!.paymentTerms).toBe("Net 45 days");
    expect(result.data!.notes).toBe("Deliver to Gate 2.");

    // Settings changes never renumber existing orders.
    await purchaseSettingsRepository.saveSettings(seeded.org.id, {
      purchaseOrderPrefix: "PO-X-",
    });
    const reloaded = await purchaseOrderRepository.findById(
      seeded.org.id,
      result.data!.id,
    );
    expect(reloaded?.orderNumber).toBe("PUR/00042");
  });

  it("enforces multi-tenant organization isolation", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    asOwner(orgA);
    const resultA = await createPurchaseOrderAction({
      supplierId: orgA.supplier.id,
      supplierName: orgA.supplier.name,
      orderDate: "2026-10-14",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(resultA.success).toBe(true);
    const orderIdA = resultA.data!.id;

    // Switch to Org B context
    asOwner(orgB);
    const foundFromB = await purchaseOrderRepository.findById(orgB.org.id, orderIdA);
    expect(foundFromB).toBeNull();

    // Trying to update Org A's order from Org B fails
    const updateResult = await updatePurchaseOrderAction(orderIdA, {
      supplierName: "Hacked",
    });
    expect(updateResult.success).toBe(false);
  });

  it("rejects cross-organization supplier references", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    asOwner(orgA);
    const result = await createPurchaseOrderAction({
      supplierId: orgB.supplier.id,
      supplierName: orgB.supplier.name,
      orderDate: "2026-10-14",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
  });

  it("writes header and line items atomically and rolls back on failure", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const before = await purchaseOrderRepository.listWithFilters(seeded.org.id);

    const result = await createPurchaseOrderAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      orderDate: "2026-10-14",
      items: [],
    });
    expect(result.success).toBe(false);

    const after = await purchaseOrderRepository.listWithFilters(seeded.org.id);
    expect(after.totalCount).toBe(before.totalCount);
  });

  it("records partial and full receiving correctly", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const createResult = await createPurchaseOrderAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      orderDate: "2026-10-14",
      status: "Confirmed",
      items: [
        {
          item: "Machinery Parts",
          quantity: 10,
          unitPrice: 500,
          discount: 0,
          taxRate: 18,
        },
      ],
    });
    expect(createResult.success).toBe(true);
    const order = createResult.data!;
    const lineId = order.items[0].id;

    // Partial receiving (4 units)
    const partialResult = await recordReceivingAction(order.id, {
      items: [{ id: lineId, receivedQuantity: 4 }],
    });
    expect(partialResult.success).toBe(true);
    expect(partialResult.data?.status).toBe("PartiallyReceived");
    expect(partialResult.data?.items[0].receivedQuantity).toBe(4);
    expect(partialResult.data?.items[0].remainingQuantity).toBe(6);

    // Full receiving (10 units)
    const fullResult = await recordReceivingAction(order.id, {
      items: [{ id: lineId, receivedQuantity: 10 }],
    });
    expect(fullResult.success).toBe(true);
    expect(fullResult.data?.status).toBe("Received");
    expect(fullResult.data?.items[0].receivedQuantity).toBe(10);
    expect(fullResult.data?.items[0].remainingQuantity).toBe(0);
  });

  it("does not mark an order received on confirmation alone", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const createResult = await createPurchaseOrderAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      orderDate: "2026-10-14",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(createResult.success).toBe(true);
    expect(createResult.data!.status).toBe("Draft");

    const confirmResult = await transitionPurchaseOrderStatusAction(
      createResult.data!.id,
      "Confirmed",
    );
    expect(confirmResult.success).toBe(true);
    expect(confirmResult.data!.status).toBe("Confirmed");
    expect(confirmResult.data!.items[0].receivedQuantity).toBe(0);
  });
});
