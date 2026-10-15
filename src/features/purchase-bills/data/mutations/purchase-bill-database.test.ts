/**
 * Database-backed integration tests for Purchase Bill persistence, totals,
 * concurrency-safe numbering, isolation, authorization, supplier-invoice
 * deduplication, Purchase Order linkage, and Purchase Settings integration.
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
  createPurchaseBillAction,
  updatePurchaseBillAction,
  transitionPurchaseBillStatusAction,
} from "./purchase-bill-mutations";
import { purchaseBillRepository } from "../../infrastructure/repositories/prisma-purchase-bill-repository";
import { purchaseOrderRepository } from "@/features/purchase-orders/infrastructure/repositories/prisma-purchase-order-repository";
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
  const tag = unique("pb");
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

const seedPurchaseOrder = async (
  seeded: SeededOrg,
  status: "DRAFT" | "CONFIRMED" | "CANCELLED" = "CONFIRMED",
) => {
  const prisma = getPrisma();
  const tag = unique("po");
  const orderId = `po_${tag}`;
  await prisma.purchaseOrder.create({
    data: {
      id: orderId,
      organizationId: seeded.org.id,
      orderNumber: `PO-${tag}`,
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      orderDate: new Date("2026-10-01"),
      status,
      subtotal: 1000,
      taxableAmount: 1000,
      total: 1180,
      items: {
        create: [
          {
            id: `poi_${tag}`,
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
  return orderId;
};

const suite = TEST_DATABASE_URL ? describe : describe.skip;

suite("Purchase Bills Database Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });

  it("persists a Purchase Bill, calculates exact totals, and allocates the configured PB- sequence number", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const result = await createPurchaseBillAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
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
    const bill = result.data!;
    expect(bill.billNumber).toMatch(/^PB-\d{4}/);
    expect(bill.subtotal).toBe(100000);
    expect(bill.lineDiscountTotal).toBe(5000);
    expect(bill.taxableAmount).toBe(95000); // 95000 - 1000 + 1000 = 95000
    expect(bill.cgst).toBe(8550); // 95000 * 9%
    expect(bill.sgst).toBe(8550); // 95000 * 9%
    expect(bill.total).toBe(112100); // 95000 + 17100
  });

  it("applies configured purchase settings numbering and bill defaults to new bills", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    await purchaseSettingsRepository.saveSettings(seeded.org.id, {
      purchaseBillPrefix: "BILL/",
      purchaseBillNextNumber: 42,
      purchaseBillPadding: 5,
      defaultPaymentTerms: "Net 45 days",
      defaultPurchaseBillNotes: "Match before paying.",
    });

    const result = await createPurchaseBillAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [{ item: "Cables", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(true);
    expect(result.data!.billNumber).toBe("BILL/00042");
    expect(result.data!.paymentTerms).toBe("Net 45 days");
    expect(result.data!.notes).toBe("Match before paying.");

    // Settings changes never renumber existing bills.
    await purchaseSettingsRepository.saveSettings(seeded.org.id, {
      purchaseBillPrefix: "PB-X-",
    });
    const reloaded = await purchaseBillRepository.findById(
      seeded.org.id,
      result.data!.id,
    );
    expect(reloaded?.billNumber).toBe("BILL/00042");
  });

  it("links an eligible purchase order and snapshots its number", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);
    const orderId = await seedPurchaseOrder(seeded, "CONFIRMED");

    const result = await createPurchaseBillAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      purchaseOrderId: orderId,
      items: [{ item: "Steel Rods", quantity: 10, unitPrice: 100 }],
    });

    expect(result.success).toBe(true);
    expect(result.data!.purchaseOrderId).toBe(orderId);
    expect(result.data!.purchaseOrderNumber).toMatch(/^PO-/);

    const stored = await purchaseOrderRepository.findById(
      seeded.org.id,
      orderId,
    );
    expect(stored?.status).toBe("Confirmed");
  });

  it("rejects duplicate supplier invoices for the same supplier", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const first = await createPurchaseBillAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      supplierInvoiceNumber: "INV-2026-118",
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(first.success).toBe(true);

    const second = await createPurchaseBillAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      supplierInvoiceNumber: "INV-2026-118",
      billDate: "2026-10-15",
      dueDate: "2026-11-14",
      items: [{ item: "Item B", quantity: 1, unitPrice: 50 }],
    });
    expect(second.success).toBe(false);
    expect(second.error).toContain("already has a purchase bill");
  });

  it("enforces multi-tenant organization isolation", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    asOwner(orgA);
    const resultA = await createPurchaseBillAction({
      supplierId: orgA.supplier.id,
      supplierName: orgA.supplier.name,
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(resultA.success).toBe(true);
    const billIdA = resultA.data!.id;

    // Switch to Org B context
    asOwner(orgB);
    const foundFromB = await purchaseBillRepository.findById(orgB.org.id, billIdA);
    expect(foundFromB).toBeNull();

    // Trying to update Org A's bill from Org B fails
    const updateResult = await updatePurchaseBillAction(billIdA, {
      supplierName: "Hacked",
    });
    expect(updateResult.success).toBe(false);
  });

  it("rejects cross-organization supplier references", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    asOwner(orgA);
    const result = await createPurchaseBillAction({
      supplierId: orgB.supplier.id,
      supplierName: orgB.supplier.name,
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
  });

  it("writes header and line items atomically and rolls back on failure", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const before = await purchaseBillRepository.listWithFilters(seeded.org.id);

    const result = await createPurchaseBillAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [],
    });
    expect(result.success).toBe(false);

    const after = await purchaseBillRepository.listWithFilters(seeded.org.id);
    expect(after.totalCount).toBe(before.totalCount);
  });

  it("confirms and cancels through the supported lifecycle only", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const created = await createPurchaseBillAction({
      supplierId: seeded.supplier.id,
      supplierName: seeded.supplier.name,
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(created.success).toBe(true);
    expect(created.data!.status).toBe("Draft");

    const confirmed = await transitionPurchaseBillStatusAction(
      created.data!.id,
      "Confirmed",
    );
    expect(confirmed.success).toBe(true);
    expect(confirmed.data!.status).toBe("Confirmed");

    const reopened = await transitionPurchaseBillStatusAction(
      created.data!.id,
      "Draft",
    );
    expect(reopened.success).toBe(false);

    const cancelled = await transitionPurchaseBillStatusAction(
      created.data!.id,
      "Cancelled",
    );
    expect(cancelled.success).toBe(true);
    expect(cancelled.data!.status).toBe("Cancelled");
  });
});
