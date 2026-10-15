import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSupplierAction } from "./create-supplier";
import { updateSupplierAction } from "./update-supplier";
import { updateSupplierStatusAction } from "./update-supplier-status";
import { deleteSupplierAction } from "./delete-supplier";
import { SupplierDuplicateError } from "../../domain/errors/supplier-errors";

// Mock server-only and next/cache
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockMemberRole = "owner";

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/supplier-context", () => ({
  resolveSupplierContext: vi.fn().mockImplementation(async () => ({
    organizationId: "org-test-uuid",
    userId: "user-test-uuid",
    memberRole: mockMemberRole,
  })),
}));

// Mock supplierRepository
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateStatus = vi.fn();
const mockDelete = vi.fn();
const mockFindById = vi.fn();
const mockFindByGstin = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-supplier-repository", () => ({
  supplierRepository: {
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByGstin: (...args: unknown[]) => mockFindByGstin(...args),
  },
}));

const billingAddress = {
  addressLine1: "14 MG Road",
  city: "Pune",
  state: "Maharashtra",
  pinCode: "411001",
  country: "India",
};

describe("Supplier Server Mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberRole = "owner";
    mockFindByGstin.mockResolvedValue(null);
  });

  describe("createSupplierAction", () => {
    it("returns validation failure when supplier name is missing", async () => {
      const res = await createSupplierAction({
        name: "",
        gstTreatment: "CONSUMER_UNREGISTERED",
        billingAddress,
      });

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.name).toBeDefined();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("creates a supplier with normalized tax identifiers", async () => {
      mockCreate.mockImplementation(async (supplier) => supplier);

      const res = await createSupplierAction({
        name: "Shree Balaji Traders",
        gstTreatment: "REGISTERED_BUSINESS_REGULAR",
        gstin: " 27aabcs1234f1z5 ",
        pan: "aabcs1234f",
        billingAddress,
      });

      expect(res.success).toBe(true);
      expect(mockFindByGstin).toHaveBeenCalledWith(
        "org-test-uuid",
        "27AABCS1234F1Z5",
      );
      expect(mockCreate).toHaveBeenCalled();
      const created = mockCreate.mock.calls[0][0] as {
        gstin: string | null;
        pan: string | null;
        id: string;
      };
      expect(created.gstin).toBe("27AABCS1234F1Z5");
      expect(created.pan).toBe("AABCS1234F");
      expect(created.id.startsWith("sup_")).toBe(true);
    });

    it("rejects a duplicate GSTIN within the organization", async () => {
      mockFindByGstin.mockResolvedValue({ id: "sup-existing" });

      const res = await createSupplierAction({
        name: "Duplicate Traders",
        gstTreatment: "REGISTERED_BUSINESS_REGULAR",
        gstin: "27AABCS1234F1Z5",
        billingAddress,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("already exists");
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("maps repository unique violations to duplicate errors", async () => {
      mockCreate.mockRejectedValue(new SupplierDuplicateError("GSTIN", "27AABCS1234F1Z5"));

      const res = await createSupplierAction({
        name: "Racy Traders",
        gstTreatment: "REGISTERED_BUSINESS_REGULAR",
        gstin: "27AABCS1234F1Z5",
        billingAddress,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("already exists");
    });
  });

  describe("updateSupplierAction", () => {
    it("returns not found for unknown suppliers", async () => {
      mockFindById.mockResolvedValue(null);

      const res = await updateSupplierAction("sup-missing", { name: "Renamed Supplier Co" });

      expect(res.success).toBe(false);
      expect(res.error).toContain("not found");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("enforces merged-record GSTIN rules on sparse patches", async () => {
      mockFindById.mockResolvedValue({
        id: "sup-1",
        gstTreatment: "REGISTERED_BUSINESS_REGULAR",
        gstin: null,
      });

      const res = await updateSupplierAction("sup-1", { phone: "+91 1" });

      expect(res.success).toBe(false);
      expect(res.fieldErrors?.gstin).toBeDefined();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("rejects GSTIN collisions excluding the record itself", async () => {
      mockFindById.mockResolvedValue({
        id: "sup-1",
        gstTreatment: "CONSUMER_UNREGISTERED",
        gstin: null,
      });
      mockFindByGstin.mockResolvedValue({ id: "sup-other" });

      const res = await updateSupplierAction("sup-1", {
        gstin: "27AABCS1234F1Z5",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("already exists");
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("applies sparse patches without touching unspecified fields", async () => {
      mockFindById.mockResolvedValue({
        id: "sup-1",
        gstTreatment: "CONSUMER_UNREGISTERED",
        gstin: null,
      });
      mockUpdate.mockImplementation(async (_org: string, _id: string, patch: Record<string, unknown>) => ({
        id: "sup-1",
        organizationId: "org-test-uuid",
        name: "Existing",
        status: "ACTIVE",
        billingAddress: {
          addressLine1: "14 MG Road",
          city: "Pune",
          state: "Maharashtra",
          pinCode: "411001",
          country: "India",
        },
        shippingAddress: {
          addressLine1: "14 MG Road",
          city: "Pune",
          state: "Maharashtra",
          pinCode: "411001",
          country: "India",
        },
        sameAsBillingAddress: true,
        gstTreatment: "CONSUMER_UNREGISTERED",
        currency: "INR (₹)",
        createdAt: new Date(),
        updatedAt: new Date(),
        ...patch,
      }));

      const res = await updateSupplierAction("sup-1", { phone: "+91 98220 00000" });

      expect(res.success).toBe(true);
      const patch = mockUpdate.mock.calls[0][2] as Record<string, unknown>;
      expect(patch.phone).toBe("+91 98220 00000");
      expect("name" in patch).toBe(false);
      expect("gstin" in patch).toBe(false);
    });
  });

  describe("updateSupplierStatusAction", () => {
    it("rejects invalid status payloads", async () => {
      const res = await updateSupplierStatusAction("sup-1", "ARCHIVED" as never);

      expect(res.success).toBe(false);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it("validates the transition against current status", async () => {
      mockFindById.mockResolvedValue({ id: "sup-1", status: "ACTIVE" });
      mockUpdateStatus.mockImplementation(async () => ({
        id: "sup-1",
        organizationId: "org-test-uuid",
        name: "Existing",
        status: "INACTIVE",
        billingAddress: {
          addressLine1: "14 MG Road",
          city: "Pune",
          state: "Maharashtra",
          pinCode: "411001",
          country: "India",
        },
        shippingAddress: {
          addressLine1: "14 MG Road",
          city: "Pune",
          state: "Maharashtra",
          pinCode: "411001",
          country: "India",
        },
        sameAsBillingAddress: true,
        gstTreatment: "CONSUMER_UNREGISTERED",
        currency: "INR (₹)",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const ok = await updateSupplierStatusAction("sup-1", "INACTIVE");
      expect(ok.success).toBe(true);
      expect(mockUpdateStatus).toHaveBeenCalledWith("org-test-uuid", "sup-1", "INACTIVE");

      mockFindById.mockResolvedValue(null);
      const missing = await updateSupplierStatusAction("sup-gone", "ACTIVE");
      expect(missing.success).toBe(false);
      expect(missing.error).toContain("not found");
    });
  });

  describe("deleteSupplierAction", () => {
    it("allows owners and scopes deletion to the organization", async () => {
      mockFindById.mockResolvedValue({ id: "sup-1" });

      const res = await deleteSupplierAction("sup-1");

      expect(res.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith("org-test-uuid", "sup-1");
    });

    it("rejects non-admin members", async () => {
      mockMemberRole = "member";
      mockFindById.mockResolvedValue({ id: "sup-1" });

      const res = await deleteSupplierAction("sup-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("permission");
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("returns not found for unknown suppliers", async () => {
      mockFindById.mockResolvedValue(null);

      const res = await deleteSupplierAction("sup-missing");

      expect(res.success).toBe(false);
      expect(res.error).toContain("not found");
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
