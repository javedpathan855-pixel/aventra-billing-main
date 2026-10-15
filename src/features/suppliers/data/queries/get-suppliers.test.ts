import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSuppliers } from "./get-suppliers";
import { getSupplier } from "./get-supplier";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock supplier context
vi.mock("../context/supplier-context", () => ({
  resolveSupplierContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-uuid",
    userId: "user-test-uuid",
    memberRole: "owner",
  }),
}));

// Mock supplierRepository
const mockList = vi.fn();
const mockFindById = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-supplier-repository", () => ({
  supplierRepository: {
    list: (...args: unknown[]) => mockList(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

describe("getSuppliers Query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retrieves suppliers scoped strictly to the current authenticated organization", async () => {
    mockList.mockResolvedValueOnce({
      suppliers: [],
      totalCount: 0,
    });

    const result = await getSuppliers({
      query: "Balaji",
      page: 1,
      pageSize: 8,
    });

    expect(result.suppliers).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(mockList).toHaveBeenCalledWith("org-test-uuid", {
      query: "Balaji",
      status: undefined,
      limit: 8,
      offset: 0,
    });
  });

  it("maps repository rows to DTOs with ISO date strings", async () => {
    const row = {
      id: "sup-1",
      organizationId: "org-test-uuid",
      name: "Shree Balaji Traders",
      status: "ACTIVE",
      contactPerson: null,
      email: null,
      phone: null,
      alternatePhone: null,
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
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: null,
      pan: null,
      currency: "INR (₹)",
      paymentTerms: null,
      internalNotes: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    mockList.mockResolvedValueOnce({ suppliers: [row], totalCount: 1 });

    const result = await getSuppliers();

    expect(result.totalCount).toBe(1);
    expect(result.suppliers[0]?.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(mockList).toHaveBeenCalledWith("org-test-uuid", {
      query: undefined,
      status: undefined,
      limit: 20,
      offset: 0,
    });
  });
});

describe("getSupplier Query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for cross-organization records", async () => {
    mockFindById.mockResolvedValueOnce(null);

    const result = await getSupplier("sup-foreign");

    expect(result).toBeNull();
    expect(mockFindById).toHaveBeenCalledWith("org-test-uuid", "sup-foreign");
  });
});
