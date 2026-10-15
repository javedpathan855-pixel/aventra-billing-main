/**
 * Database-backed integration tests for Billing Settings persistence,
 * numbering configuration, collision guards, and organization isolation.
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
import { getPrisma } from "@/shared/lib/prisma";
import { getAuthState } from "@/features/auth";
import {
  allocateDocumentNumberAction,
  updateBillingSettingsAction,
} from "./billing-settings-mutations";
import { getBillingSettings } from "../queries/get-billing-settings";
import { resolveBillingSettingsContext } from "../context/billing-settings-context";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  getAuthState: vi.fn(),
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));
vi.mock("../context/billing-settings-context", () => ({
  resolveBillingSettingsContext: vi.fn(),
}));

const mockResolveContext = vi.mocked(resolveBillingSettingsContext);
const mockGetAuthState = vi.mocked(getAuthState);
let seq = 7000;
const unique = (prefix: string): string => `${prefix}-${Date.now()}-${(seq += 1)}`;

type SeededOrg = {
  orgId: string;
  ownerId: string;
  memberId: string;
};

const seedOrg = async (): Promise<SeededOrg> => {
  const prisma = getPrisma();
  const tag = unique("t");
  const orgId = `org_${tag}`;
  const ownerId = `user_owner_${tag}`;
  const memberId = `user_member_${tag}`;
  const now = new Date();
  await prisma.organization.create({
    data: { id: orgId, name: `Test Org ${tag}`, slug: `test-org-${tag}`, createdAt: now },
  });
  await prisma.user.createMany({
    data: [
      { id: ownerId, name: "Owner", email: `owner-${tag}@example.com`, emailVerified: true },
      { id: memberId, name: "Member", email: `member-${tag}@example.com`, emailVerified: true },
    ],
  });
  await prisma.member.createMany({
    data: [
      { id: `mem_owner_${tag}`, organizationId: orgId, userId: ownerId, role: "owner", createdAt: now },
      { id: `mem_member_${tag}`, organizationId: orgId, userId: memberId, role: "member", createdAt: now },
    ],
  });
  return { orgId, ownerId, memberId };
};

const authAs = (seeded: SeededOrg, who: "owner" | "member"): void => {
  const userId = who === "owner" ? seeded.ownerId : seeded.memberId;
  mockResolveContext.mockResolvedValue({
    organizationId: seeded.orgId,
    userId,
    memberRole: who,
  });
  mockGetAuthState.mockResolvedValue({
    status: "authenticated",
    user: { id: userId, name: who, email: `${who}@example.com`, emailVerified: true },
    organization: {
      id: seeded.orgId,
      name: "Test Org",
      slug: "test-org",
      role: who,
      onboardingStatus: "COMPLETED",
    },
  });
};

describe.skipIf(!TEST_DATABASE_URL)("billing settings database integration", () => {
  // Billing-settings rows are strictly organization-scoped and every test
  // seeds its own organization, so no destructive cleanup is needed.
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("saves invoice settings and reloads the same values with a formatted preview", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const saved = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "ACME-",
      suffix: "/26",
      nextNumber: 5,
      padding: 3,
      defaultNotes: "Pay promptly.",
      defaultTerms: "Net 15 days.",
    });
    expect(saved.success).toBe(true);

    const reloaded = await getBillingSettings("INVOICE");
    expect(reloaded.prefix).toBe("ACME-");
    expect(reloaded.suffix).toBe("/26");
    expect(reloaded.nextNumber).toBe(5);
    expect(reloaded.padding).toBe(3);
    expect(reloaded.defaultNotes).toBe("Pay promptly.");
    expect(reloaded.defaultTerms).toBe("Net 15 days.");
    expect(reloaded.previewNumber).toBe("ACME-005/26");
  });

  it("denies settings updates to members with no persisted side effects", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "member");

    const res = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "HACK-",
      nextNumber: 99,
      padding: 4,
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toContain("don't have permission");

    expect(
      await getPrisma().billingSettings.count({
        where: { organizationId: seeded.orgId },
      }),
    ).toBe(0);
  });

  it("rejects invalid prefixes server-side with field errors", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const res = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "has space!",
      padding: 4,
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.fieldErrors?.prefix).toBeDefined();
    expect(
      await getPrisma().billingSettings.count({
        where: { organizationId: seeded.orgId },
      }),
    ).toBe(0);
  });

  it("round-trips recurring-invoice defaults consumed by the schedule form", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const saved = await updateBillingSettingsAction({
      documentType: "RECURRING_INVOICE",
      prefix: "REC-",
      padding: 4,
      defaultNotes: "Recurring schedule default note.",
      defaultTerms: "Recurring schedule default terms.",
    });
    expect(saved.success).toBe(true);

    const reloaded = await getBillingSettings("RECURRING_INVOICE");
    expect(reloaded.defaultNotes).toBe("Recurring schedule default note.");
    expect(reloaded.defaultTerms).toBe("Recurring schedule default terms.");
  });

  it("allocates numbers honoring custom prefix, padding, and suffix", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");

    const saved = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "TST-",
      padding: 3,
      nextNumber: 1,
    });
    expect(saved.success).toBe(true);

    const first = await allocateDocumentNumberAction("INVOICE");
    expect(first.success).toBe(true);
    if (!first.success) return;
    expect(first.data.allocatedNumber).toBe("TST-001");

    const second = await allocateDocumentNumberAction("INVOICE");
    expect(second.success).toBe(true);
    if (!second.success) return;
    expect(second.data.allocatedNumber).toBe("TST-002");
  });

  it("skips colliding debit-note numbers when reading settings", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const day = new Date("2026-10-15T00:00:00.000Z");

    await prisma.invoice.create({
      data: {
        id: `inv_${unique("i")}`,
        organizationId: seeded.orgId,
        invoiceNumber: "INV-0001",
        customerName: "Acme",
        issueDate: day,
        dueDate: day,
        subtotal: 100,
        taxableAmount: 100,
        total: 118,
      },
    });
    await prisma.debitNote.create({
      data: {
        id: `dn_${unique("d")}`,
        organizationId: seeded.orgId,
        debitNoteNumber: "DN-0001",
        invoiceId: (await prisma.invoice.findFirstOrThrow({ where: { organizationId: seeded.orgId } })).id,
        customerName: "Acme",
        issueDate: day,
        reason: "Seeded collision",
        subtotal: 100,
        taxableAmount: 100,
        total: 118,
      },
    });

    const settings = await getBillingSettings("DEBIT_NOTE");
    expect(settings.nextNumber).toBe(2);
    expect(settings.previewNumber).toBe("DN-0002");
  });

  it("refuses to reset the invoice sequence onto an existing number", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();
    const day = new Date("2026-10-15T00:00:00.000Z");

    await prisma.invoice.create({
      data: {
        id: `inv_${unique("i")}`,
        organizationId: seeded.orgId,
        invoiceNumber: "INV-0005",
        customerName: "Acme",
        issueDate: day,
        dueDate: day,
        subtotal: 100,
        taxableAmount: 100,
        total: 118,
      },
    });

    const res = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "INV-",
      nextNumber: 5,
      padding: 4,
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toContain("already exists");
  });

  it("isolates settings between organizations", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();

    authAs(orgA, "owner");
    const saved = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "ORGA-",
      padding: 4,
    });
    expect(saved.success).toBe(true);

    authAs(orgB, "owner");
    const other = await getBillingSettings("INVOICE");
    expect(other.prefix).toBe("INV-");
    expect(other.nextNumber).toBe(1);

    const allocated = await allocateDocumentNumberAction("INVOICE");
    expect(allocated.success).toBe(true);
    if (!allocated.success) return;
    expect(allocated.data.allocatedNumber).toBe("INV-0001");
  });

  it("synthesizes defaults without writing phantom rows", async () => {
    const seeded = await seedOrg();
    authAs(seeded, "owner");
    const prisma = getPrisma();

    const settings = await getBillingSettings("CREDIT_NOTE");
    expect(settings.prefix).toBe("CN-");
    expect(settings.previewNumber).toBe("CN-0001");
    expect(
      await prisma.billingSettings.count({
        where: { organizationId: seeded.orgId },
      }),
    ).toBe(0);
  });
});
