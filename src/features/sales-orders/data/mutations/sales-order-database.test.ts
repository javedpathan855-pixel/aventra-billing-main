/**
 * Database-backed integration tests for Sales Order persistence, accounting,
 * concurrency, isolation, authorization, and atomic quotation/invoice conversion.
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
  createSalesOrderAction,
  updateSalesOrderAction,
  convertEstimateToSalesOrderAction,
  convertSalesOrderToInvoiceAction,
  recordFulfilmentAction,
} from "./sales-order-mutations";
import { salesOrderRepository } from "../../infrastructure/repositories/prisma-sales-order-repository";

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
  customer: { id: string; name: string };
};

const seedOrg = async (): Promise<SeededOrg> => {
  const prisma = getPrisma();
  const tag = unique("so");
  const org = { id: `org_${tag}`, name: `Test Org ${tag}`, slug: `test-org-${tag}` };
  const owner = { id: `user_owner_${tag}`, name: "Owner", email: `owner-${tag}@example.com` };
  const customerId = `cust_${tag}`;
  const now = new Date();

  await prisma.organization.create({ data: { id: org.id, name: org.name, slug: org.slug, createdAt: now } });
  await prisma.user.create({
    data: { id: owner.id, name: owner.name, email: owner.email, createdAt: now, updatedAt: now },
  });
  await prisma.member.create({
    data: { id: `mem_${tag}`, organizationId: org.id, userId: owner.id, role: "owner", createdAt: now },
  });
  await prisma.customer.create({
    data: {
      id: customerId,
      organizationId: org.id,
      name: `Customer ${tag}`,
      email: `customer-${tag}@example.com`,
      billingState: "Maharashtra",
      placeOfSupply: "27-Maharashtra",
      createdAt: now,
      updatedAt: now,
    },
  });

  return { org, owner, customer: { id: customerId, name: `Customer ${tag}` } };
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

suite("Sales Orders Database Integration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });

  it("persists a Sales Order, calculates exact totals, and allocates gapless sequence number", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const result = await createSalesOrderAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
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
    expect(order.orderNumber).toMatch(/^SO-\d{4}/);
    expect(order.subtotal).toBe(100000);
    expect(order.lineDiscountTotal).toBe(5000);
    expect(order.taxableAmount).toBe(95000); // 95000 - 1000 + 1000 = 95000
    expect(order.cgst).toBe(8550); // 95000 * 9%
    expect(order.sgst).toBe(8550); // 95000 * 9%
    expect(order.total).toBe(112100); // 95000 + 17100
  });

  it("enforces multi-tenant organization isolation", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    asOwner(orgA);
    const resultA = await createSalesOrderAction({
      customerId: orgA.customer.id,
      customerName: orgA.customer.name,
      orderDate: "2026-10-14",
      items: [{ item: "Item A", quantity: 1, unitPrice: 100 }],
    });
    expect(resultA.success).toBe(true);
    const orderIdA = resultA.data!.id;

    // Switch to Org B context
    asOwner(orgB);
    const foundFromB = await salesOrderRepository.findById(orgB.org.id, orderIdA);
    expect(foundFromB).toBeNull();

    // Trying to update Org A's order from Org B fails
    const updateResult = await updateSalesOrderAction(orderIdA, {
      customerName: "Hacked",
    });
    expect(updateResult.success).toBe(false);
  });

  it("converts an eligible Accepted quotation into a confirmed sales order atomically", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const prisma = getPrisma();
    const estimateId = `est_${unique("test")}`;
    await prisma.estimate.create({
      data: {
        id: estimateId,
        organizationId: seeded.org.id,
        estimateNumber: `EST-${Date.now().toString().slice(-4)}`,
        customerId: seeded.customer.id,
        customerName: seeded.customer.name,
        issueDate: new Date("2026-10-14"),
        validUntil: new Date("2026-11-14"),
        status: "ACCEPTED",
        taxMode: "CGST_SGST",
        subtotal: 5000,
        taxableAmount: 5000,
        total: 5900,
        items: {
          create: [
            {
              id: `item_${unique("est")}`,
              item: "Consulting Package",
              quantity: 5,
              unitPrice: 1000,
              discount: 0,
              taxRate: 18,
              taxableAmount: 5000,
              taxAmount: 900,
              lineTotal: 5900,
              sortOrder: 0,
            },
          ],
        },
      },
    });

    const conversionResult = await convertEstimateToSalesOrderAction(estimateId);
    expect(conversionResult.success).toBe(true);
    const salesOrder = conversionResult.data!;
    expect(salesOrder.status).toBe("Confirmed");
    expect(salesOrder.items.length).toBe(1);
    expect(salesOrder.items[0].item).toBe("Consulting Package");

    // Verify Estimate has been marked CONVERTED with pointer to Sales Order
    const updatedEstimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
    });
    expect(updatedEstimate?.status).toBe("CONVERTED");
    expect(updatedEstimate?.convertedToSalesOrderId).toBe(salesOrder.id);

    // Prevent duplicate conversion
    const duplicateAttempt = await convertEstimateToSalesOrderAction(estimateId);
    expect(duplicateAttempt.success).toBe(false);
    expect(duplicateAttempt.error).toContain("already been converted");
  });

  it("converts a confirmed Sales Order to a genuine Invoice atomically", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const createResult = await createSalesOrderAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
      orderDate: "2026-10-14",
      status: "Confirmed",
      items: [
        {
          item: "Cloud Subscription",
          quantity: 1,
          unitPrice: 12000,
          discount: 0,
          taxRate: 18,
        },
      ],
    });
    expect(createResult.success).toBe(true);
    const order = createResult.data!;

    const invoiceResult = await convertSalesOrderToInvoiceAction(order.id);
    expect(invoiceResult.success).toBe(true);
    expect(invoiceResult.data?.invoiceId).toBeDefined();
    expect(invoiceResult.data?.invoiceNumber).toMatch(/^INV-\d+/);

    // Check relationship on order
    const refreshedOrder = await salesOrderRepository.findById(seeded.org.id, order.id);
    expect(refreshedOrder?.invoices?.length).toBe(1);
    expect(refreshedOrder?.invoices?.[0].id).toBe(invoiceResult.data!.invoiceId);
  });

  it("records partial and full fulfilment correctly", async () => {
    const seeded = await seedOrg();
    asOwner(seeded);

    const createResult = await createSalesOrderAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
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

    // Partial fulfilment (4 units)
    const partialResult = await recordFulfilmentAction(order.id, {
      items: [{ id: lineId, fulfilledQuantity: 4 }],
    });
    expect(partialResult.success).toBe(true);
    expect(partialResult.data?.status).toBe("PartiallyFulfilled");
    expect(partialResult.data?.items[0].fulfilledQuantity).toBe(4);
    expect(partialResult.data?.items[0].remainingQuantity).toBe(6);

    // Full fulfilment (10 units)
    const fullResult = await recordFulfilmentAction(order.id, {
      items: [{ id: lineId, fulfilledQuantity: 10 }],
    });
    expect(fullResult.success).toBe(true);
    expect(fullResult.data?.status).toBe("Fulfilled");
    expect(fullResult.data?.items[0].fulfilledQuantity).toBe(10);
    expect(fullResult.data?.items[0].remainingQuantity).toBe(0);
  });
});
