import { describe, expect, it, vi, beforeEach } from "vitest";
import { PrismaSupplierRepository } from "./prisma-supplier-repository";
import { SupplierNotFoundError, SupplierDuplicateError } from "../../domain/errors/supplier-errors";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock getPrisma
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdateMany = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    supplier: {
      findMany: mockFindMany,
      count: mockCount,
      findFirst: mockFindFirst,
      create: mockCreate,
      updateMany: mockUpdateMany,
      deleteMany: mockDeleteMany,
    },
  }),
}));

const row = {
  id: "sup-1",
  organizationId: "org-test-1",
  name: "Shree Balaji Traders",
  status: "ACTIVE",
  contactPerson: null,
  email: null,
  phone: null,
  alternatePhone: null,
  billingAddressLine1: "14 MG Road",
  billingAddressLine2: null,
  billingCity: "Pune",
  billingState: "Maharashtra",
  billingPinCode: "411001",
  billingCountry: "India",
  sameAsBillingAddress: true,
  shippingAddressLine1: "14 MG Road",
  shippingAddressLine2: null,
  shippingCity: "Pune",
  shippingState: "Maharashtra",
  shippingPinCode: "411001",
  shippingCountry: "India",
  gstTreatment: "REGISTERED_BUSINESS_REGULAR",
  gstin: null,
  pan: null,
  currency: "INR (₹)",
  paymentTerms: null,
  internalNotes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("PrismaSupplierRepository", () => {
  let repository: PrismaSupplierRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaSupplierRepository();
  });

  it("strictly scopes findById queries to the active organization", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await repository.findById("org-test-1", "sup-1");
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        id: "sup-1",
        organizationId: "org-test-1",
      },
    });
  });

  it("strictly scopes list queries, search filters, and pagination", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockCount.mockResolvedValueOnce(0);

    const result = await repository.list("org-test-1", {
      query: "Balaji",
      status: "ACTIVE",
      limit: 8,
      offset: 8,
    });

    expect(result).toEqual({ suppliers: [], totalCount: 0 });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-test-1",
        status: "ACTIVE",
        OR: [
          { name: { contains: "Balaji", mode: "insensitive" } },
          { email: { contains: "Balaji", mode: "insensitive" } },
          { phone: { contains: "Balaji", mode: "insensitive" } },
          { contactPerson: { contains: "Balaji", mode: "insensitive" } },
          { gstin: { contains: "Balaji", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: 8,
      take: 8,
    });
    expect(mockCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ organizationId: "org-test-1" }),
    });
  });

  it("maps unique violations to duplicate errors on create", async () => {
    mockCreate.mockRejectedValueOnce({ code: "P2002" });

    await expect(
      repository.create({
        id: "sup-1",
        organizationId: "org-test-1",
        name: "Shree Balaji Traders",
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
        gstTreatment: "REGISTERED_BUSINESS_REGULAR",
        gstin: "27AABCS1234F1Z5",
        currency: "INR (₹)",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(SupplierDuplicateError);
  });

  it("scopes updates and deletes to the organization and reports missing records", async () => {
    mockUpdateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      repository.update("org-test-1", "sup-gone", { name: "X" }),
    ).rejects.toBeInstanceOf(SupplierNotFoundError);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "sup-gone", organizationId: "org-test-1" },
      data: { name: "X" },
    });

    mockDeleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.delete("org-test-1", "sup-gone")).rejects.toBeInstanceOf(
      SupplierNotFoundError,
    );

    mockDeleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(repository.delete("org-test-1", "sup-1")).resolves.toBeUndefined();
  });

  it("maps persisted rows back to the domain entity", async () => {
    mockFindFirst.mockResolvedValueOnce(row);

    const result = await repository.findById("org-test-1", "sup-1");
    expect(result?.name).toBe("Shree Balaji Traders");
    expect(result?.billingAddress.city).toBe("Pune");
  });
});
