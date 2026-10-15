/**
 * Database-backed integration tests for credit-note issuance, settlement,
 * fixed-discount GST persistence, billing-settings concurrency, and
 * catalogue/customer deletion guards (final verification).
 *
 * Runs ONLY when AVENTRA_TEST_DATABASE_URL is set, pointing at an isolated
 * PostgreSQL test database with all project migrations applied. Without the
 * env var the suite skips.
 */
const TEST_DATABASE_URL = process.env.AVENTRA_TEST_DATABASE_URL;
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import { getAuthState } from "@/features/auth";
import { calculateInvoiceTotals, formatCurrency } from "@/features/invoices";
import { calculateCreditNoteTotals } from "../../domain/credit-note";
import {
  createCreditNoteAction,
  updateCreditNoteAction,
  issueCreditNoteAction,
} from "./credit-note-mutations";
import { createInvoiceAction } from "@/features/invoices/data/mutations/invoice-mutations";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import { creditNoteRepository } from "../../infrastructure/repositories/prisma-credit-note-repository";
import {
  allocateDocumentNumberAction,
  updateBillingSettingsAction,
} from "@/features/billing-settings/data/mutations/billing-settings-mutations";
import { billingSettingsRepository } from "@/features/billing-settings";
import { deleteCustomerAction } from "@/features/customers/data/mutations/delete-customer";
import { deleteProductAction } from "@/features/products/data/mutations/product-mutations";
import { InvoiceDocument } from "@/features/invoices/presentation/components/InvoiceDocument";

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
let seq = 1000;
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

const createStandardInvoice = async (customerName = "Acme") => {
  const res = await createInvoiceAction({
    customerName,
    customerPlaceOfSupply: "27-Maharashtra",
    issueDate: "2026-10-15",
    dueDate: "2026-10-30",
    status: "Issued",
    items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
  });
  expect(res.success).toBe(true);
  return res.data?.id ?? "";
};

describe.skipIf(!TEST_DATABASE_URL)("credit note database integration", () => {
  // NOTE: no table truncation here — see the invoice database suite. Each
  // test seeds a uniquely-suffixed organization and asserts only its own rows.
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("settles via the draft-to-issued update path exactly like dedicated issuance", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const invoiceId = await createStandardInvoice();

    const draft = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Rate correction",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(draft.success).toBe(true);
    const draftId = draft.success ? draft.data.id : "";

    // Draft has no financial effect.
    expect(await prisma.creditNote.count({ where: { invoiceId, status: "ISSUED" } })).toBe(0);

    const updated = await updateCreditNoteAction({
      id: draftId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Rate correction",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(updated.success).toBe(true);
    // 1,180 credit against 11,800 with zero cash: receivable reduced, status
    // stays Issued (credit is not payment).
    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    expect(Number(reloaded?.creditedAmount)).toBe(1180);
    const raw = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.ISSUED);
  });

  it("marks a cash-paid invoice PAID and applies issuance exactly once on retry", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const inv = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      amountPaid: 11800,
      items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
    });
    expect(inv.success).toBe(true);
    const invoiceId = inv.data?.id ?? "";

    const draft = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Draft",
      reason: "Refund",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(draft.success).toBe(true);
    const draftId = draft.success ? draft.data.id : "";

    const [first, second] = await Promise.all([
      issueCreditNoteAction(draftId),
      issueCreditNoteAction(draftId),
    ]);
    const successes = [first, second].filter((r) => r.success).length;
    expect(successes).toBe(1);
    expect([first, second].some((r) => !r.success)).toBe(true);

    // Exactly one financial effect: one issued note totaling 1,180.
    expect(await prisma.creditNote.count({ where: { invoiceId, status: "ISSUED" } })).toBe(1);
    const issued = await creditNoteRepository.getIssuedTotalForInvoice(seeded.org.id, invoiceId);
    expect(issued).toBe(1180);
    // Fully cash-paid invoice stays PAID (cash semantics preserved).
    const raw = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(raw?.status).toBe(PrismaInvoiceStatus.PAID);
  });

  it("persists fixed-discount GST identical to domain totals and renders the same total", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const res = await createInvoiceAction({
      customerName: "Acme",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: "2026-10-15",
      dueDate: "2026-10-30",
      status: "Issued",
      additionalDiscount: 2000,
      additionalDiscountType: "fixed",
      items: [{ item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
    });
    expect(res.success).toBe(true);
    const invoiceId = res.data?.id ?? "";

    // Persisted snapshot agrees with the authoritative domain calculation.
    const raw = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    expect(Number(raw?.taxableAmount)).toBe(8000);
    expect(Number(raw?.totalTax)).toBe(1440);
    expect(Number(raw?.cgst)).toBe(720);
    expect(Number(raw?.sgst)).toBe(720);
    expect(Number(raw?.total)).toBe(9440);

    // UI preview path (same domain function) agrees with persistence.
    const reloaded = await invoiceRepository.findById(seeded.org.id, invoiceId);
    const preview = calculateInvoiceTotals({
      items: reloaded?.items ?? [],
      amountPaid: Number(reloaded?.amountPaid ?? 0),
      taxMode: reloaded?.taxMode ?? "CGST_SGST",
      additionalCharges: reloaded?.additionalCharges,
      additionalDiscount: reloaded?.additionalDiscount,
      additionalDiscountType: reloaded?.additionalDiscountType,
    });
    expect(preview.total).toBe(Number(raw?.total));
    expect(preview.tax).toBe(Number(raw?.totalTax));

    // Rendered document agrees with the persisted total.
    const documentInvoice = reloaded ?? res.data;
    if (!documentInvoice) {
      throw new Error("expected the persisted invoice to reload");
    }
    const html = renderToStaticMarkup(
      createElement(InvoiceDocument, { invoice: documentInvoice }),
    );
    expect(html).toContain(formatCurrency(9440));

    // Credit-note totals agree with their domain calculation too.
    const cn = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Partial return",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(cn.success).toBe(true);
    const cnRaw = await prisma.creditNote.findFirst({ where: { invoiceId, status: "ISSUED" } });
    const expected = calculateCreditNoteTotals({
      items: [{ id: "x", item: "Service", description: "", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
      taxMode: "CGST_SGST",
    });
    expect(Number(cnRaw?.total)).toBe(expected.total);
  });

  it("keeps credit-note numbering unique under concurrency and previews free", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const results = await Promise.all(
      Array.from({ length: 8 }, () => allocateDocumentNumberAction("CREDIT_NOTE")),
    );
    expect(results.every((r) => r.success)).toBe(true);
    const numbers = results.map((r) => (r.success ? r.data.allocatedNumber : ""));
    expect(new Set(numbers).size).toBe(8);

    const before = await billingSettingsRepository.getSettings(seeded.org.id, "CREDIT_NOTE");
    await billingSettingsRepository.getSettings(seeded.org.id, "CREDIT_NOTE");
    const after = await billingSettingsRepository.getSettings(seeded.org.id, "CREDIT_NOTE");
    expect(after.nextNumber).toBe(before.nextNumber);
  });

  it("denies billing-settings, customer, and product mutations to members against real rows", async () => {
    const seeded = await seedOrg();
    const prisma = getPrisma();

    authAs(seeded, "owner");
    const settingsOk = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "INV-",
      nextNumber: 10,
      padding: 4,
    });
    expect(settingsOk.success).toBe(true);

    const customer = await prisma.customer.create({
      data: {
        id: `cust_${unique("c")}`,
        organizationId: seeded.org.id,
        name: "Acme",
        billingAddressLine1: "1 Street",
        billingCity: "Pune",
        billingState: "Maharashtra",
        billingPinCode: "411001",
      },
    });
    const product = await prisma.product.create({
      data: {
        id: `prod_${unique("p")}`,
        organizationId: seeded.org.id,
        name: "Widget",
        sellingPrice: 100,
      },
    });

    authAs(seeded, "member");
    const settingsDenied = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "X-",
      nextNumber: 99,
      padding: 4,
    });
    expect(settingsDenied.success).toBe(false);
    const allocDenied = await allocateDocumentNumberAction("INVOICE");
    expect(allocDenied.success).toBe(false);
    const custDenied = await deleteCustomerAction(customer.id);
    expect(custDenied.success).toBe(false);
    const prodDenied = await deleteProductAction(product.id);
    expect(prodDenied.success).toBe(false);
    expect(await prisma.customer.count({ where: { id: customer.id } })).toBe(1);
    expect(await prisma.product.count({ where: { id: product.id } })).toBe(1);
    const settingsRow = await prisma.billingSettings.findUnique({
      where: { organizationId_documentType: { organizationId: seeded.org.id, documentType: "INVOICE" } },
    });
    expect(settingsRow?.prefix).toBe("INV-");

    authAs(seeded, "owner");
    expect((await deleteCustomerAction(customer.id)).success).toBe(true);
    expect((await deleteProductAction(product.id)).success).toBe(true);
    expect(await prisma.customer.count({ where: { id: customer.id } })).toBe(0);
    expect(await prisma.product.count({ where: { id: product.id } })).toBe(0);
  });

  it("numbers created credit notes with the organization's configured prefix", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const saved = await updateBillingSettingsAction({
      documentType: "CREDIT_NOTE",
      prefix: "CR-",
      padding: 4,
    });
    expect(saved.success).toBe(true);

    const invoiceId = await createStandardInvoice();
    const res = await createCreditNoteAction({
      invoiceId,
      issueDate: "2026-10-15",
      status: "Issued",
      reason: "Prefix probe",
      items: [{ item: "Service", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.creditNoteNumber).toMatch(/^CR-/);
    expect(res.data.creditNoteNumber).toBe("CR-0001");
  });
});
