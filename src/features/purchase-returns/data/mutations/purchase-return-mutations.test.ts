import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPurchaseReturnAction,
  updatePurchaseReturnStatusAction,
  deletePurchaseReturnAction,
} from "./purchase-return-mutations";
import type { PurchaseReturn } from "../../domain/entities/purchase-return";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/purchase-return-context", () => ({
  resolvePurchaseReturnContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: "owner",
  }),
}));

const mockPurchaseReturnCreate = vi.fn();
const mockPurchaseReturnUpdateStatus = vi.fn();
const mockPurchaseReturnDelete = vi.fn();
const mockPurchaseReturnFindById = vi.fn();
const mockPurchaseReturnFindByNumber = vi.fn();
const mockSumReturnedForBillItem = vi.fn();

vi.mock(
  "../../infrastructure/repositories/prisma-purchase-return-repository",
  () => ({
    purchaseReturnRepository: {
      create: (...args: unknown[]) => mockPurchaseReturnCreate(...args),
      updateStatus: (...args: unknown[]) =>
        mockPurchaseReturnUpdateStatus(...args),
      delete: (...args: unknown[]) => mockPurchaseReturnDelete(...args),
      findById: (...args: unknown[]) => mockPurchaseReturnFindById(...args),
      findByNumber: (...args: unknown[]) =>
        mockPurchaseReturnFindByNumber(...args),
      sumReturnedForBillItem: (...args: unknown[]) =>
        mockSumReturnedForBillItem(...args),
    },
  }),
);

const mockAllocatePurchaseReturnNumber = vi.fn();
const mockGetPurchaseSettings = vi.fn();
vi.mock("@/features/purchase-settings", () => ({
  purchaseSettingsRepository: {
    allocateNextPurchaseReturnNumber: (...args: unknown[]) =>
      mockAllocatePurchaseReturnNumber(...args),
    getSettings: (...args: unknown[]) => mockGetPurchaseSettings(...args),
  },
}));

const mockSupplierFindById = vi.fn();
vi.mock(
  "@/features/suppliers/infrastructure/repositories/prisma-supplier-repository",
  () => ({
    supplierRepository: {
      findById: (...args: unknown[]) => mockSupplierFindById(...args),
    },
  }),
);

const mockProductFindById = vi.fn();
vi.mock(
  "@/features/products/infrastructure/repositories/prisma-product-repository",
  () => ({
    productRepository: {
      findById: (...args: unknown[]) => mockProductFindById(...args),
    },
  }),
);

const mockPurchaseBillFindById = vi.fn();
vi.mock(
  "@/features/purchase-bills/infrastructure/repositories/prisma-purchase-bill-repository",
  () => ({
    purchaseBillRepository: {
      findById: (...args: unknown[]) => mockPurchaseBillFindById(...args),
    },
  }),
);

const mockPurchaseOrderFindById = vi.fn();
vi.mock(
  "@/features/purchase-orders/infrastructure/repositories/prisma-purchase-order-repository",
  () => ({
    purchaseOrderRepository: {
      findById: (...args: unknown[]) => mockPurchaseOrderFindById(...args),
    },
  }),
);

const mockPrismaTransaction = vi.fn();
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      mockPrismaTransaction(fn),
  }),
}));

const sampleReturn: PurchaseReturn = {
  id: "prt-123",
  organizationId: "org-test-123",
  returnNumber: "PR-0001",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  supplierEmail: "accounts@balaji.in",
  supplierAddress: "14 MG Road, Pune",
  supplierGstin: "27AABCS1234F1Z5",
  supplierPlaceOfSupply: "27-Maharashtra",
  purchaseBillId: "pb-1",
  purchaseBillNumber: "PB-0001",
  purchaseOrderId: null,
  purchaseOrderNumber: null,
  returnDate: "2026-10-14",
  reason: "Defective or damaged in transit",
  status: "DRAFT",
  taxMode: "CGST_SGST",
  currency: "INR (₹)",
  subtotal: 400,
  taxAmount: 72,
  totalAmount: 472,
  notes: null,
  terms: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: "prti-1",
      purchaseReturnId: "prt-123",
      productId: null,
      purchaseBillItemId: "pbi-1",
      item: "Steel Rods",
      description: null,
      hsnSac: null,
      billedQuantity: 10,
      returnQuantity: 4,
      unitPrice: 100,
      discount: 0,
      taxRate: 18,
      taxAmount: 72,
      lineTotal: 472,
      disposition: "RESTOCK",
      reason: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const validCreateInput = {
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  returnDate: "2026-10-14",
  reason: "Defective or damaged in transit",
  items: [
    {
      purchaseBillItemId: "pbi-1",
      item: "Steel Rods",
      billedQuantity: 10,
      returnQuantity: 4,
      unitPrice: 100,
    },
  ],
};

const sampleBill = {
  id: "pb-1",
  billNumber: "PB-0001",
  status: "Confirmed",
  supplierId: "sup-1",
  items: [{ id: "pbi-1", quantity: 10 }],
};

describe("purchase-return mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const mockTx = {};
      return callback(mockTx);
    });
    mockAllocatePurchaseReturnNumber.mockResolvedValue({
      allocatedNumber: "PR-0001",
      sequenceNumber: 1,
    });
    mockGetPurchaseSettings.mockResolvedValue({
      defaultPurchaseReturnNotes: null,
      defaultPurchaseReturnTerms: null,
    });
    mockPurchaseReturnFindByNumber.mockResolvedValue(null);
    mockSupplierFindById.mockResolvedValue({ id: "sup-1" });
    mockProductFindById.mockResolvedValue({ id: "prod-1" });
    mockPurchaseBillFindById.mockResolvedValue(sampleBill);
    mockPurchaseOrderFindById.mockResolvedValue(null);
    mockSumReturnedForBillItem.mockResolvedValue(0);
  });

  it("creates a purchase return with the configured PR- number", async () => {
    mockPurchaseReturnCreate.mockResolvedValue(sampleReturn);

    const result = await createPurchaseReturnAction({
      ...validCreateInput,
      purchaseBillId: "pb-1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.returnNumber).toBe("PR-0001");
    expect(mockAllocatePurchaseReturnNumber).toHaveBeenCalledWith(
      "org-test-123",
      expect.anything(),
    );
    expect(mockPurchaseReturnCreate).toHaveBeenCalled();
    const createInput = mockPurchaseReturnCreate.mock.calls[0][1];
    expect(createInput.purchaseBillNumber).toBe("PB-0001");
  });

  it("fails on invalid validation input", async () => {
    const result = await createPurchaseReturnAction({
      supplierName: "",
      returnDate: "not-a-date",
      reason: "",
      items: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(mockPurchaseReturnCreate).not.toHaveBeenCalled();
  });

  it("rejects return quantities exceeding the remaining balance", async () => {
    mockSumReturnedForBillItem.mockResolvedValue(8);

    const result = await createPurchaseReturnAction({
      ...validCreateInput,
      purchaseBillId: "pb-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("exceeds the remaining returnable quantity");
    expect(mockPurchaseReturnCreate).not.toHaveBeenCalled();
  });

  it("rejects bill lines that do not belong to the linked bill", async () => {
    const result = await createPurchaseReturnAction({
      ...validCreateInput,
      purchaseBillId: "pb-1",
      items: [
        {
          purchaseBillItemId: "pbi-unknown",
          item: "Steel Rods",
          billedQuantity: 10,
          returnQuantity: 1,
          unitPrice: 100,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockPurchaseReturnCreate).not.toHaveBeenCalled();
  });

  it("rejects draft and cancelled bills as return sources", async () => {
    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      status: "Draft",
    });

    const draftResult = await createPurchaseReturnAction({
      ...validCreateInput,
      purchaseBillId: "pb-1",
    });
    expect(draftResult.success).toBe(false);
    expect(draftResult.error).toContain("only Confirmed bills");

    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      status: "Cancelled",
    });

    const cancelledResult = await createPurchaseReturnAction({
      ...validCreateInput,
      purchaseBillId: "pb-1",
    });
    expect(cancelledResult.success).toBe(false);
    expect(cancelledResult.error).toContain("only Confirmed bills");
  });

  it("rejects a bill of a different supplier", async () => {
    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      supplierId: "sup-other",
    });

    const result = await createPurchaseReturnAction({
      ...validCreateInput,
      purchaseBillId: "pb-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("supplier");
    expect(mockPurchaseReturnCreate).not.toHaveBeenCalled();
  });

  it("rejects a supplier from another organization", async () => {
    mockSupplierFindById.mockResolvedValue(null);

    const result = await createPurchaseReturnAction(validCreateInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockPurchaseReturnCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate return numbers", async () => {
    mockPurchaseReturnFindByNumber.mockResolvedValue(sampleReturn);

    const result = await createPurchaseReturnAction({
      ...validCreateInput,
      returnNumber: "PR-0001",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(mockPurchaseReturnCreate).not.toHaveBeenCalled();
  });

  it("approves a Draft return", async () => {
    mockPurchaseReturnFindById.mockResolvedValue(sampleReturn);
    mockPurchaseReturnUpdateStatus.mockResolvedValue({
      ...sampleReturn,
      status: "APPROVED",
    });

    const result = await updatePurchaseReturnStatusAction("prt-123", {
      status: "APPROVED",
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("APPROVED");
    expect(mockPurchaseReturnUpdateStatus).toHaveBeenCalledWith(
      "org-test-123",
      "prt-123",
      { status: "APPROVED" },
    );
  });

  it("rejects completing a Draft return directly", async () => {
    mockPurchaseReturnFindById.mockResolvedValue(sampleReturn);

    const result = await updatePurchaseReturnStatusAction("prt-123", {
      status: "COMPLETED",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
    expect(mockPurchaseReturnUpdateStatus).not.toHaveBeenCalled();
  });

  it("rejects transitions from terminal states", async () => {
    mockPurchaseReturnFindById.mockResolvedValue({
      ...sampleReturn,
      status: "COMPLETED",
    });

    const result = await updatePurchaseReturnStatusAction("prt-123", {
      status: "CANCELLED",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
  });

  it("deletes a Draft return", async () => {
    mockPurchaseReturnFindById.mockResolvedValue(sampleReturn);
    mockPurchaseReturnDelete.mockResolvedValue(undefined);

    const result = await deletePurchaseReturnAction("prt-123");

    expect(result.success).toBe(true);
    expect(mockPurchaseReturnDelete).toHaveBeenCalledWith(
      "org-test-123",
      "prt-123",
    );
  });

  it("refuses to delete an Approved return", async () => {
    mockPurchaseReturnFindById.mockResolvedValue({
      ...sampleReturn,
      status: "APPROVED",
    });

    const result = await deletePurchaseReturnAction("prt-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Only Draft returns may be deleted");
    expect(mockPurchaseReturnDelete).not.toHaveBeenCalled();
  });

  it("returns a safe error for a missing return", async () => {
    mockPurchaseReturnFindById.mockResolvedValue(null);

    const result = await updatePurchaseReturnStatusAction("prt-missing", {
      status: "APPROVED",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("was not found");
  });
});
