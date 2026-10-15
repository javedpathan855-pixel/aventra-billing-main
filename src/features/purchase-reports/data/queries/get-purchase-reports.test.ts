/**
 * Database-backed tests for purchase report aggregation: reconciliation of
 * gross/returns/net figures, outstanding computation, tax summaries, payment
 * grouping, status breakdowns, filters, isolation, and empty results.
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
import { getPurchaseReports } from "./get-purchase-reports";

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
  const tag = unique("prpt");
  const org = { id: `org_${tag}`, name: `Test Org ${tag}`, slug: `test-org-${tag}` };
  const owner = { id: `user_owner_${tag}`, name: "Owner", email: `owner-${tag}@example.com` };
  const supplierId = `sup_${tag}`;
  const billId = `pb_${tag}`;
  const orderId = `po_${tag}`;
  const returnId = `prt_${tag}`;
  const paymentId = `spay_${tag}`;
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
  // Confirmed bill: subtotal 1000, tax 180, total 1180.
  await prisma.purchaseBill.create({
    data: {
      id: billId,
      organizationId: org.id,
      billNumber: `PB-${tag}`,
      supplierId,
      supplierName: `Supplier ${tag}`,
      billDate: new Date("2026-10-05"),
      dueDate: new Date("2026-11-04"),
      status: "CONFIRMED",
      subtotal: 1000,
      taxableAmount: 1000,
      cgst: 90,
      sgst: 90,
      totalTax: 180,
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
  // Draft bill: excluded from gross figures.
  await prisma.purchaseBill.create({
    data: {
      id: `pbd_${tag}`,
      organizationId: org.id,
      billNumber: `PBD-${tag}`,
      supplierId,
      supplierName: `Supplier ${tag}`,
      billDate: new Date("2026-10-06"),
      dueDate: new Date("2026-11-05"),
      status: "DRAFT",
      subtotal: 500,
      taxableAmount: 500,
      total: 590,
    },
  });
  // Completed return of 1 unit: taxable 100, tax 18, total 118.
  await prisma.purchaseReturn.create({
    data: {
      id: returnId,
      organizationId: org.id,
      returnNumber: `PR-${tag}`,
      supplierId,
      supplierName: `Supplier ${tag}`,
      purchaseBillId: billId,
      purchaseBillNumber: `PB-${tag}`,
      returnDate: new Date("2026-10-10"),
      reason: "Damaged",
      status: "COMPLETED",
      subtotal: 100,
      taxAmount: 18,
      totalAmount: 118,
      items: {
        create: [
          {
            id: `prti_${tag}`,
            item: "Steel Rods",
            billedQuantity: 10,
            returnQuantity: 1,
            unitPrice: 100,
            discount: 0,
            taxRate: 18,
            taxAmount: 18,
            lineTotal: 118,
            sortOrder: 0,
          },
        ],
      },
    },
  });
  // Active partial payment of 500 against the confirmed bill.
  await prisma.supplierPayment.create({
    data: {
      id: paymentId,
      organizationId: org.id,
      supplierId,
      supplierName: `Supplier ${tag}`,
      amount: 500,
      paymentDate: new Date("2026-10-12"),
      method: "BANK_TRANSFER",
      status: "ACTIVE",
      allocations: {
        create: [
          {
            id: `spalloc_${tag}`,
            organizationId: org.id,
            purchaseBillId: billId,
            amount: 500,
          },
        ],
      },
    },
  });
  // Reversed payment: must not count anywhere.
  await prisma.supplierPayment.create({
    data: {
      id: `spayr_${tag}`,
      organizationId: org.id,
      supplierId,
      supplierName: `Supplier ${tag}`,
      amount: 999,
      paymentDate: new Date("2026-10-12"),
      method: "CASH",
      status: "REVERSED",
      allocations: {
        create: [
          {
            id: `spallocr_${tag}`,
            organizationId: org.id,
            purchaseBillId: billId,
            amount: 999,
          },
        ],
      },
    },
  });
  // Confirmed purchase order of 2000 + 360 tax.
  await prisma.purchaseOrder.create({
    data: {
      id: orderId,
      organizationId: org.id,
      orderNumber: `PO-${tag}`,
      supplierId,
      supplierName: `Supplier ${tag}`,
      orderDate: new Date("2026-10-02"),
      status: "CONFIRMED",
      subtotal: 2000,
      taxableAmount: 2000,
      total: 2360,
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

suite("Purchase Reports Database Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });

  it("reconciles gross, returns, net, tax, outstanding, payments, and orders", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const reports = await getPurchaseReports({});

    // Summary: draft bill excluded; only the completed return counts.
    expect(reports.summary.billCount).toBe(1);
    expect(reports.summary.grossPurchases).toBe(1180);
    expect(reports.summary.inputTax).toBe(180);
    expect(reports.summary.returnCount).toBe(1);
    expect(reports.summary.returnsTotal).toBe(118);
    expect(reports.summary.returnsTax).toBe(18);
    expect(reports.summary.netPurchases).toBe(1062);
    expect(reports.summary.netTax).toBe(162);

    // Outstanding: 1180 - 500 active; reversed 999 ignored.
    expect(reports.outstanding.billCount).toBe(1);
    expect(reports.outstanding.totalOutstanding).toBe(680);
    expect(reports.outstanding.rows).toHaveLength(1);
    expect(reports.outstanding.rows[0].paidAmount).toBe(500);
    expect(reports.outstanding.rows[0].outstanding).toBe(680);

    // Tax: CGST/SGST split preserved; returns reduce net tax.
    expect(reports.tax.cgst).toBe(90);
    expect(reports.tax.sgst).toBe(90);
    expect(reports.tax.igst).toBe(0);
    expect(reports.tax.inputTax).toBe(180);
    expect(reports.tax.returnsTax).toBe(18);
    expect(reports.tax.netTax).toBe(162);

    // Payments: only the active bank-transfer payment counts.
    expect(reports.payments.paymentCount).toBe(1);
    expect(reports.payments.totalPaid).toBe(500);
    expect(reports.payments.byMethod).toHaveLength(1);
    expect(reports.payments.byMethod[0].method).toBe("BANK_TRANSFER");
    expect(reports.payments.bySupplier).toHaveLength(1);
    expect(reports.payments.bySupplier[0].totalPaid).toBe(500);

    // Orders and returns status breakdowns.
    expect(reports.orders.totalOrders).toBe(1);
    expect(reports.orders.totalAmount).toBe(2360);
    expect(reports.returns.returnCount).toBe(1);
    expect(reports.returns.returnsTotal).toBe(118);

    // By-supplier rollup reconciles with the summary.
    expect(reports.bySupplier).toHaveLength(1);
    const row = reports.bySupplier[0];
    expect(row.grossPurchases).toBe(1180);
    expect(row.returnsTotal).toBe(118);
    expect(row.netPurchases).toBe(1062);
    expect(row.outstanding).toBe(680);
  });

  it("applies date-range filters consistently", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const empty = await getPurchaseReports({
      from: new Date("2026-11-01"),
      to: new Date("2026-11-30"),
    });
    expect(empty.summary.billCount).toBe(0);
    expect(empty.summary.grossPurchases).toBe(0);
    expect(empty.summary.returnCount).toBe(0);
    expect(empty.payments.paymentCount).toBe(0);
    expect(empty.orders.totalOrders).toBe(0);

    const full = await getPurchaseReports({
      from: new Date("2026-10-01"),
      to: new Date("2026-10-31"),
    });
    expect(full.summary.billCount).toBe(1);
    expect(full.summary.returnCount).toBe(1);
  });

  it("isolates organizations", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    asOwner(orgA);
    const reportsA = await getPurchaseReports({});
    expect(reportsA.summary.billCount).toBe(1);

    asOwner(orgB);
    const reportsB = await getPurchaseReports({});
    expect(reportsB.summary.billCount).toBe(1);
    expect(reportsB.bySupplier[0].supplierName).toBe(orgB.supplier.name);
  });

  it("returns empty results for an untouched organization", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const prisma = getPrisma();
    const tag = unique("empty");
    const emptyOrg = {
      id: `org_${tag}`,
      name: `Empty ${tag}`,
      slug: `empty-${tag}`,
    };
    await prisma.organization.create({
      data: { id: emptyOrg.id, name: emptyOrg.name, slug: emptyOrg.slug, createdAt: new Date() },
    });
    await prisma.member.create({
      data: {
        id: `mem_${tag}`,
        organizationId: emptyOrg.id,
        userId: seeded.owner.id,
        role: "owner",
        createdAt: new Date(),
      },
    });
    mockGetAuthState.mockResolvedValue({
      status: "authenticated",
      user: { id: seeded.owner.id, name: seeded.owner.name, email: seeded.owner.email, role: "user" },
      session: { id: `sess_${Date.now()}` },
      organization: { id: emptyOrg.id, name: emptyOrg.name, slug: emptyOrg.slug, role: "owner" },
      membership: null,
      memberships: [],
    } as unknown as Awaited<ReturnType<typeof getAuthState>>);

    const reports = await getPurchaseReports({});
    expect(reports.summary.billCount).toBe(0);
    expect(reports.summary.netPurchases).toBe(0);
    expect(reports.outstanding.billCount).toBe(0);
    expect(reports.bySupplier).toHaveLength(0);
    expect(reports.payments.paymentCount).toBe(0);
  });
});
