/**
 * Database-backed integration tests for estimate persistence, accounting,
 * concurrency, isolation, authorization, and atomic invoice conversion.
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
  createEstimateAction,
  updateEstimateAction,
  transitionEstimateStatusAction,
  deleteEstimateAction,
  convertEstimateToInvoiceAction,
} from "./estimate-mutations";
import { estimateRepository } from "../../infrastructure/repositories/prisma-estimate-repository";
import { calculateEstimateTotals } from "../../domain/rules/estimate-rules";
import { saveSalesSettingsAction } from "@/features/sales-settings/data/mutations/save-sales-settings";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import { calculateInvoiceTotals } from "@/features/invoices";

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
  customer: { id: string; name: string };
};

const seedOrg = async (): Promise<SeededOrg> => {
  const prisma = getPrisma();
  const tag = unique("est");
  const org = { id: `org_${tag}`, name: `Test Org ${tag}`, slug: `test-org-${tag}` };
  const owner = { id: `user_owner_${tag}`, name: "Owner", email: `owner-${tag}@example.com` };
  const member = { id: `user_member_${tag}`, name: "Member", email: `member-${tag}@example.com` };
  const customerId = `cust_${tag}`;
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

  await prisma.customer.create({
    data: {
      id: customerId,
      organizationId: org.id,
      name: `Acme Corp ${tag}`,
      email: `acme-${tag}@example.com`,
      phone: "+919876543210",
      billingAddressLine1: "123 Business Park",
      billingCity: "Mumbai",
      billingState: "27-Maharashtra",
      billingPinCode: "400001",
      billingCountry: "India",
      gstin: "27AABCA1234A1Z5",
      pan: "AABCA1234A",
      placeOfSupply: "27-Maharashtra",
    },
  });

  return {
    org,
    owner,
    member,
    customer: { id: customerId, name: `Acme Corp ${tag}` },
  };
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

describe.skipIf(!TEST_DATABASE_URL)("estimate database integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("persists an estimate with items and reloads identical calculated totals and numbering", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const result = await createEstimateAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      notes: "Quotation for software services",
      terms: "Standard 30 days validity",
      items: [
        {
          item: "Software Architecture Consulting",
          description: "Detailed architecture design",
          quantity: 10,
          unitPrice: 2000,
          discount: 5, // 5% discount = 1,000 off 20,000 -> 19,000 taxable
          taxRate: 18,
        },
        {
          item: "Cloud Deployment",
          description: "Infra provisioning",
          quantity: 2,
          unitPrice: 5000,
          discount: 0,
          taxRate: 18,
        },
      ],
      additionalDiscount: 500,
      additionalDiscountType: "fixed",
      additionalCharges: 200,
    });

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;

    expect(result.data.estimateNumber).toMatch(/^EST-\d{4}$/);
    expect(result.data.status).toBe("Draft");

    const totals = calculateEstimateTotals(result.data);
    expect(totals.subtotal).toBe(30000);
    expect(totals.discount).toBe(1500);
    expect(totals.tax).toBe(5130);
    expect(totals.total).toBe(33830);

    // Verify database reload via repository
    const fetched = await estimateRepository.findById(seeded.org.id, result.data.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.estimateNumber).toBe(result.data.estimateNumber);
    expect(fetched!.items).toHaveLength(2);

    const reloadedTotals = calculateEstimateTotals(fetched!);
    expect(reloadedTotals.total).toBe(33830);
  });

  it("allocates unique estimate numbers under concurrent creations", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const promises = Array.from({ length: 5 }, (_, idx) =>
      createEstimateAction({
        customerId: seeded.customer.id,
        customerName: seeded.customer.name,
        issueDate: "2026-10-14",
        validUntil: "2026-11-14",
        items: [
          {
            item: `Concurrent Service ${idx}`,
            quantity: 1,
            unitPrice: 1000,
            discount: 0,
            taxRate: 18,
          },
        ],
      }),
    );

    const results = await Promise.all(promises);
    const numbers = results.map((r) => {
      expect(r.success).toBe(true);
      return (r as { data?: { estimateNumber: string } }).data?.estimateNumber;
    });

    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(5);
  });

  it("enforces organization isolation at the database boundary", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    // Create in Org A
    authAs(orgA, "owner");
    const createRes = await createEstimateAction({
      customerId: orgA.customer.id,
      customerName: orgA.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      items: [
        {
          item: "Private estimate",
          quantity: 1,
          unitPrice: 500,
          discount: 0,
          taxRate: 0,
        },
      ],
    });
    expect(createRes.success).toBe(true);
    if (!createRes.success || !createRes.data) return;
    const estimateId = createRes.data.id;

    // Switch to Org B
    authAs(orgB, "owner");

    // Reading should return null
    const readAttempt = await estimateRepository.findById(orgB.org.id, estimateId);
    expect(readAttempt).toBeNull();

    // Updating should fail
    const updateAttempt = await updateEstimateAction({
      id: estimateId,
      customerId: orgB.customer.id,
      customerName: orgB.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      items: [{ item: "Hack", quantity: 1, unitPrice: 100, discount: 0, taxRate: 0 }],
    });
    expect(updateAttempt.success).toBe(false);

    // Deleting should fail
    const deleteAttempt = await deleteEstimateAction(estimateId);
    expect(deleteAttempt.success).toBe(false);

    // Converting should fail
    const convertAttempt = await convertEstimateToInvoiceAction(estimateId);
    expect(convertAttempt.success).toBe(false);
  });

  it("allows valid lifecycle transitions from Draft -> Sent -> Accepted", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const createRes = await createEstimateAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      items: [{ item: "Lifecycle test", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(createRes.success).toBe(true);
    if (!createRes.success || !createRes.data) return;
    const estId = createRes.data.id;

    // Transition to Sent
    const sendRes = await transitionEstimateStatusAction(estId, "Sent");
    expect(sendRes.success).toBe(true);
    if (sendRes.success && sendRes.data) expect(sendRes.data.status).toBe("Sent");

    // Transition to Accepted
    const acceptRes = await transitionEstimateStatusAction(estId, "Accepted");
    expect(acceptRes.success).toBe(true);
    if (acceptRes.success && acceptRes.data) expect(acceptRes.data.status).toBe("Accepted");

    // Transition from Accepted to Draft should be blocked
    const revertRes = await transitionEstimateStatusAction(estId, "Draft");
    expect(revertRes.success).toBe(false);
  });

  it("converts an accepted estimate to a real invoice in an atomic transaction", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    // Create estimate
    const createRes = await createEstimateAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      notes: "Agreed terms for implementation",
      terms: "Payment in 15 days",
      items: [
        {
          item: "System Design & Migration",
          quantity: 5,
          unitPrice: 10000,
          discount: 4, // 4% = 2,000 discount
          taxRate: 18,
        },
      ],
      additionalDiscount: 1000,
      additionalDiscountType: "fixed",
      additionalCharges: 500,
    });
    expect(createRes.success).toBe(true);
    if (!createRes.success || !createRes.data) return;
    const estId = createRes.data.id;

    // Mark as Sent then Accepted
    const sendRes = await transitionEstimateStatusAction(estId, "Sent");
    expect(sendRes.success).toBe(true);
    const acceptRes = await transitionEstimateStatusAction(estId, "Accepted");
    expect(acceptRes.success).toBe(true);

    // Convert to Invoice
    const convertRes = await convertEstimateToInvoiceAction(estId);
    expect(convertRes.success).toBe(true);
    if (!convertRes.success || !convertRes.data) return;

    expect(convertRes.data.estimate.status).toBe("Converted");
    expect(convertRes.data.invoiceId).toBeDefined();
    const invoiceId = convertRes.data.invoiceId;

    // Verify invoice exists and has correct data
    const createdInvoice = await invoiceRepository.findById(seeded.org.id, invoiceId);
    expect(createdInvoice).not.toBeNull();
    expect(createdInvoice!.customerId).toBe(seeded.customer.id);
    expect(createdInvoice!.items).toHaveLength(1);
    expect(createdInvoice!.items[0].item).toBe("System Design & Migration");
    expect(createdInvoice!.notes).toBe("Agreed terms for implementation");

    const estTotals = calculateEstimateTotals(convertRes.data.estimate);
    const invoiceTotals = calculateInvoiceTotals(createdInvoice!);
    expect(invoiceTotals.total).toBe(estTotals.total);

    // Verify estimate record in db reflects conversion
    const estInDb = await estimateRepository.findById(seeded.org.id, estId);
    expect(estInDb!.status).toBe("Converted");
    expect(estInDb!.convertedToInvoiceId).toBe(invoiceId);

    // Verify estimate cannot be converted again
    const secondConvertRes = await convertEstimateToInvoiceAction(estId);
    expect(secondConvertRes.success).toBe(false);
    expect(secondConvertRes.error).toMatch(/Converted/i);

    // Verify converted estimate cannot be updated
    const updateRes = await updateEstimateAction({
      id: estId,
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      items: [{ item: "Post-conversion change", quantity: 1, unitPrice: 100, discount: 0, taxRate: 0 }],
    });
    expect(updateRes.success).toBe(false);
  });

  it("customizes estimate prefix and sequence via SalesSettings", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    // Update sales settings with custom prefix "QUOT-" and nextSequence 500
    const settingsRes = await saveSalesSettingsAction({
      estimatePrefix: "QUOT-",
      estimateSuffix: "",
      estimateNextNumber: 500,
      estimatePadding: 4,
      defaultValidityDays: 45,
      defaultNotes: "Custom quotation notes",
      defaultTerms: "Custom quotation terms",
    });
    expect(settingsRes.success).toBe(true);

    // Create estimate
    const createRes = await createEstimateAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      items: [{ item: "Custom settings test", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    expect(createRes.success).toBe(true);
    if (!createRes.success || !createRes.data) return;

    expect(createRes.data.estimateNumber).toBe("QUOT-0500");

    // Next one should be QUOT-0501
    const createSecondRes = await createEstimateAction({
      customerId: seeded.customer.id,
      customerName: seeded.customer.name,
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      items: [{ item: "Second test", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 0 }],
    });
    expect(createSecondRes.success).toBe(true);
    if (!createSecondRes.success || !createSecondRes.data) return;

    expect(createSecondRes.data.estimateNumber).toBe("QUOT-0501");
  });
});
