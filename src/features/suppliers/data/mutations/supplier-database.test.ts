/**
 * Database-backed integration tests for Supplier persistence, GSTIN
 * uniqueness, organization isolation, authorization, and status lifecycle.
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
import { createSupplierAction } from "./create-supplier";
import { updateSupplierAction } from "./update-supplier";
import { updateSupplierStatusAction } from "./update-supplier-status";
import { deleteSupplierAction } from "./delete-supplier";
import { getSuppliers } from "../queries/get-suppliers";
import { getSupplier } from "../queries/get-supplier";
import { resolveSupplierContext } from "../context/supplier-context";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  getAuthState: vi.fn(),
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));
vi.mock("../context/supplier-context", () => ({
  resolveSupplierContext: vi.fn(),
}));

const mockResolveContext = vi.mocked(resolveSupplierContext);
const mockGetAuthState = vi.mocked(getAuthState);
let seq = 9000;
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

const address = {
  addressLine1: "14 MG Road",
  city: "Pune",
  state: "Maharashtra",
  pinCode: "411001",
  country: "India",
};

describe.skipIf(!TEST_DATABASE_URL)("supplier database integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("persists a supplier end to end with normalized identifiers", async () => {
    const { orgId } = await seedOrg();
    mockResolveContext.mockResolvedValue({
      organizationId: orgId,
      userId: "user-test",
      memberRole: "owner",
    });
    mockGetAuthState.mockResolvedValue({
      status: "authenticated",
      user: { id: "user-test" },
      organization: { id: orgId },
    } as never);

    const created = await createSupplierAction({
      name: "Shree Balaji Traders",
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: " 27aabcs1234f1z5 ",
      billingAddress: address,
    });

    expect(created.success).toBe(true);
    expect(created.data?.gstin).toBe("27AABCS1234F1Z5");
    expect(created.data?.pan).toBeNull();

    const fetched = await getSupplier(created.data?.id ?? "");
    expect(fetched?.name).toBe("Shree Balaji Traders");

    const listed = await getSuppliers({ query: "Balaji" });
    expect(listed.totalCount).toBe(1);
  });

  it("rejects duplicate GSTIN values within an organization", async () => {
    const { orgId } = await seedOrg();
    mockResolveContext.mockResolvedValue({
      organizationId: orgId,
      userId: "user-test",
      memberRole: "owner",
    });

    const first = await createSupplierAction({
      name: "First Traders",
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: "27AABCS1234F1Z5",
      billingAddress: address,
    });
    expect(first.success).toBe(true);

    const second = await createSupplierAction({
      name: "Second Traders",
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: "27aabcs1234f1z5",
      billingAddress: address,
    });
    expect(second.success).toBe(false);
    expect(second.error).toContain("already exists");
  });

  it("isolates supplier records between organizations", async () => {
    const orgA = await seedOrg();
    const orgB = await seedOrg();
    mockResolveContext.mockResolvedValue({
      organizationId: orgA.orgId,
      userId: "user-test",
      memberRole: "owner",
    });

    const created = await createSupplierAction({
      name: "Org A Supplier",
      gstTreatment: "CONSUMER_UNREGISTERED",
      billingAddress: address,
    });
    expect(created.success).toBe(true);
    const supplierId = created.data?.id ?? "";

    // Same GSTIN is allowed in a different organization.
    mockResolveContext.mockResolvedValue({
      organizationId: orgB.orgId,
      userId: "user-test",
      memberRole: "owner",
    });
    const crossGstin = await createSupplierAction({
      name: "Org B Supplier",
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: "27AABCS1234F1Z5",
      billingAddress: address,
    });
    expect(crossGstin.success).toBe(true);

    // Records from org A are invisible to org B.
    expect(await getSupplier(supplierId)).toBeNull();
    const updateAttempt = await updateSupplierAction(supplierId, {
      phone: "+91 1",
    });
    expect(updateAttempt.success).toBe(false);
    const deleteAttempt = await deleteSupplierAction(supplierId);
    expect(deleteAttempt.success).toBe(false);

    const listed = await getSuppliers({});
    expect(listed.suppliers.every((s) => s.organizationId === orgB.orgId)).toBe(true);
  });

  it("transitions status and enforces admin-only deletion", async () => {
    const { orgId } = await seedOrg();
    mockResolveContext.mockResolvedValue({
      organizationId: orgId,
      userId: "user-test",
      memberRole: "owner",
    });

    const created = await createSupplierAction({
      name: "Toggle Traders",
      gstTreatment: "CONSUMER_UNREGISTERED",
      billingAddress: address,
    });
    const supplierId = created.data?.id ?? "";

    const deactivated = await updateSupplierStatusAction(supplierId, "INACTIVE");
    expect(deactivated.success).toBe(true);
    expect(deactivated.data?.status).toBe("INACTIVE");

    const reactivated = await updateSupplierStatusAction(supplierId, "ACTIVE");
    expect(reactivated.success).toBe(true);

    mockResolveContext.mockResolvedValue({
      organizationId: orgId,
      userId: "user-test",
      memberRole: "member",
    });
    const memberDelete = await deleteSupplierAction(supplierId);
    expect(memberDelete.success).toBe(false);

    mockResolveContext.mockResolvedValue({
      organizationId: orgId,
      userId: "user-test",
      memberRole: "owner",
    });
    const ownerDelete = await deleteSupplierAction(supplierId);
    expect(ownerDelete.success).toBe(true);
    expect(await getSupplier(supplierId)).toBeNull();
  });
});
