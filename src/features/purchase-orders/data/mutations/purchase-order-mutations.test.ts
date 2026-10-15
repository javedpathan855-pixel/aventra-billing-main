import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
  transitionPurchaseOrderStatusAction,
  deletePurchaseOrderAction,
  recordReceivingAction,
} from "./purchase-order-mutations";
import type { PurchaseOrder } from "../../domain/entities/purchase-order";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/purchase-order-context", () => ({
  resolvePurchaseOrderContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: "owner",
  }),
}));

const mockPurchaseOrderCreate = vi.fn();
const mockPurchaseOrderUpdate = vi.fn();
const mockPurchaseOrderUpdateStatus = vi.fn();
const mockPurchaseOrderDelete = vi.fn();
const mockPurchaseOrderFindById = vi.fn();
const mockPurchaseOrderFindByNumber = vi.fn();
const mockUpdateItemReceiving = vi.fn();

vi.mock(
  "../../infrastructure/repositories/prisma-purchase-order-repository",
  () => ({
    purchaseOrderRepository: {
      create: (...args: unknown[]) => mockPurchaseOrderCreate(...args),
      update: (...args: unknown[]) => mockPurchaseOrderUpdate(...args),
      updateStatus: (...args: unknown[]) =>
        mockPurchaseOrderUpdateStatus(...args),
      delete: (...args: unknown[]) => mockPurchaseOrderDelete(...args),
      findById: (...args: unknown[]) => mockPurchaseOrderFindById(...args),
      findByNumber: (...args: unknown[]) =>
        mockPurchaseOrderFindByNumber(...args),
      updateItemReceiving: (...args: unknown[]) =>
        mockUpdateItemReceiving(...args),
    },
  }),
);

const mockAllocatePurchaseOrderNumber = vi.fn();
const mockGetPurchaseSettings = vi.fn();
vi.mock("@/features/purchase-settings", () => ({
  purchaseSettingsRepository: {
    allocateNextPurchaseOrderNumber: (...args: unknown[]) =>
      mockAllocatePurchaseOrderNumber(...args),
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

const mockPrismaTransaction = vi.fn();
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      mockPrismaTransaction(fn),
  }),
}));

const sampleOrder: PurchaseOrder = {
  id: "po-123",
  organizationId: "org-test-123",
  orderNumber: "PO-0001",
  supplierName: "Shree Balaji Traders",
  orderDate: "2026-10-14",
  expectedDeliveryDate: "2026-10-29",
  status: "Draft",
  taxMode: "CGST_SGST",
  currency: "INR (₹)",
  paymentTerms: "Net 30 days",
  subtotal: 1000,
  lineDiscountTotal: 0,
  additionalDiscount: 0,
  additionalDiscountType: "fixed",
  additionalCharges: 0,
  taxableAmount: 1000,
  cgst: 90,
  sgst: 90,
  igst: 0,
  totalTax: 180,
  total: 1180,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: "po-item-1",
      purchaseOrderId: "po-123",
      item: "Steel Rods",
      quantity: 10,
      receivedQuantity: 0,
      remainingQuantity: 10,
      unitPrice: 100,
      discount: 0,
      taxRate: 18,
      taxableAmount: 1000,
      taxAmount: 180,
      lineTotal: 1180,
      sortOrder: 0,
    },
  ],
};

describe("purchase-order mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const mockTx = {};
      return callback(mockTx);
    });
    mockAllocatePurchaseOrderNumber.mockResolvedValue({
      allocatedNumber: "PO-0001",
      sequenceNumber: 1,
    });
    mockGetPurchaseSettings.mockResolvedValue({
      defaultDeliveryDays: 15,
      defaultPaymentTerms: "Net 30 days",
      defaultPurchaseOrderNotes: null,
      defaultPurchaseOrderTerms: null,
    });
    mockPurchaseOrderFindByNumber.mockResolvedValue(null);
  });

  it("creates a purchase order with the configured PO- number", async () => {
    mockPurchaseOrderCreate.mockResolvedValue(sampleOrder);

    const result = await createPurchaseOrderAction({
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      items: [
        {
          item: "Steel Rods",
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.orderNumber).toBe("PO-0001");
    expect(mockAllocatePurchaseOrderNumber).toHaveBeenCalledWith(
      "org-test-123",
      expect.anything(),
    );
    expect(mockPurchaseOrderCreate).toHaveBeenCalled();
  });

  it("applies purchase settings defaults for payment terms and notes", async () => {
    mockPurchaseOrderCreate.mockResolvedValue(sampleOrder);

    await createPurchaseOrderAction({
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
    });

    const createInput = mockPurchaseOrderCreate.mock.calls[0][1];
    expect(createInput.paymentTerms).toBe("Net 30 days");
  });

  it("fails to create a purchase order on invalid validation input", async () => {
    const result = await createPurchaseOrderAction({
      supplierName: "",
      orderDate: "not-a-date",
      items: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.fieldErrors).toBeDefined();
    expect(mockPurchaseOrderCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate order numbers within the organization", async () => {
    mockPurchaseOrderFindByNumber.mockResolvedValue(sampleOrder);

    const result = await createPurchaseOrderAction({
      orderNumber: "PO-0001",
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(mockPurchaseOrderCreate).not.toHaveBeenCalled();
  });

  it("updates an existing Draft purchase order", async () => {
    mockPurchaseOrderFindById.mockResolvedValue(sampleOrder);
    mockPurchaseOrderUpdate.mockResolvedValue({
      ...sampleOrder,
      supplierName: "Balaji Global",
    });

    const result = await updatePurchaseOrderAction("po-123", {
      supplierName: "Balaji Global",
    });

    expect(result.success).toBe(true);
    expect(result.data?.supplierName).toBe("Balaji Global");
    expect(mockPurchaseOrderUpdate).toHaveBeenCalled();
  });

  it("prevents editing a Confirmed or Received purchase order", async () => {
    mockPurchaseOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    const result = await updatePurchaseOrderAction("po-123", {
      supplierName: "Changed",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be modified");
    expect(mockPurchaseOrderUpdate).not.toHaveBeenCalled();
  });

  it("transitions purchase order status from Draft to Confirmed", async () => {
    mockPurchaseOrderFindById.mockResolvedValue(sampleOrder);
    mockPurchaseOrderUpdateStatus.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    const result = await transitionPurchaseOrderStatusAction(
      "po-123",
      "Confirmed",
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("Confirmed");
    expect(mockPurchaseOrderUpdateStatus).toHaveBeenCalledWith(
      "org-test-123",
      "po-123",
      "Confirmed",
    );
  });

  it("rejects invalid status transitions like Cancelled to Confirmed", async () => {
    mockPurchaseOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Cancelled",
    });

    const result = await transitionPurchaseOrderStatusAction(
      "po-123",
      "Confirmed",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
    expect(mockPurchaseOrderUpdateStatus).not.toHaveBeenCalled();
  });

  it("rejects Draft to Received transitions that skip confirmation", async () => {
    mockPurchaseOrderFindById.mockResolvedValue(sampleOrder);

    const result = await transitionPurchaseOrderStatusAction(
      "po-123",
      "Received",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
    expect(mockPurchaseOrderUpdateStatus).not.toHaveBeenCalled();
  });

  it("deletes a Draft purchase order", async () => {
    mockPurchaseOrderFindById.mockResolvedValue(sampleOrder);
    mockPurchaseOrderDelete.mockResolvedValue(undefined);

    const result = await deletePurchaseOrderAction("po-123");

    expect(result.success).toBe(true);
    expect(mockPurchaseOrderDelete).toHaveBeenCalledWith(
      "org-test-123",
      "po-123",
    );
  });

  it("refuses to delete a Confirmed purchase order", async () => {
    mockPurchaseOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    const result = await deletePurchaseOrderAction("po-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be modified");
    expect(mockPurchaseOrderDelete).not.toHaveBeenCalled();
  });

  it("records receiving and blocks over-receiving", async () => {
    mockPurchaseOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    // Over-receiving attempt (12 > 10)
    const failResult = await recordReceivingAction("po-123", {
      items: [{ id: "po-item-1", receivedQuantity: 12 }],
    });

    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain("cannot exceed ordered quantity");

    // Valid receiving
    mockUpdateItemReceiving.mockResolvedValue({
      ...sampleOrder,
      status: "PartiallyReceived",
      items: [
        {
          ...sampleOrder.items[0],
          receivedQuantity: 5,
          remainingQuantity: 5,
        },
      ],
    });

    const successResult = await recordReceivingAction("po-123", {
      items: [{ id: "po-item-1", receivedQuantity: 5 }],
    });

    expect(successResult.success).toBe(true);
    expect(successResult.data?.status).toBe("PartiallyReceived");
  });

  it("refuses receiving against Draft orders", async () => {
    mockPurchaseOrderFindById.mockResolvedValue(sampleOrder);

    const result = await recordReceivingAction("po-123", {
      items: [{ id: "po-item-1", receivedQuantity: 2 }],
    });

    expect(result.success).toBe(false);
    expect(mockUpdateItemReceiving).not.toHaveBeenCalled();
  });

  it("rejects a supplier from another organization on create", async () => {
    mockSupplierFindById.mockResolvedValue(null);

    const result = await createPurchaseOrderAction({
      supplierId: "sup-foreign",
      supplierName: "Foreign Supplier",
      orderDate: "2026-10-14",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockSupplierFindById).toHaveBeenCalledWith(
      "org-test-123",
      "sup-foreign",
    );
    expect(mockPurchaseOrderCreate).not.toHaveBeenCalled();
  });

  it("rejects a product from another organization on create", async () => {
    mockProductFindById.mockResolvedValue(null);

    const result = await createPurchaseOrderAction({
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      items: [
        { item: "Steel Rods", quantity: 1, unitPrice: 100, productId: "prod-foreign" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockProductFindById).toHaveBeenCalledWith(
      "org-test-123",
      "prod-foreign",
    );
    expect(mockPurchaseOrderCreate).not.toHaveBeenCalled();
  });

  it("rejects a forged Received status on create", async () => {
    const result = await createPurchaseOrderAction({
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      status: "Received",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.fieldErrors?.status).toBeDefined();
    expect(mockPurchaseOrderCreate).not.toHaveBeenCalled();
  });

  it("returns a safe error for a missing document on update", async () => {
    mockPurchaseOrderFindById.mockResolvedValue(null);

    const result = await updatePurchaseOrderAction("po-missing", {
      supplierName: "Changed",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("was not found");
  });
});
