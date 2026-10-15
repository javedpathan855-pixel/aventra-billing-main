import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPurchaseBillAction,
  updatePurchaseBillAction,
  transitionPurchaseBillStatusAction,
  deletePurchaseBillAction,
} from "./purchase-bill-mutations";
import type { PurchaseBill } from "../../domain/entities/purchase-bill";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/purchase-bill-context", () => ({
  resolvePurchaseBillContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: "owner",
  }),
}));

const mockPurchaseBillCreate = vi.fn();
const mockPurchaseBillUpdate = vi.fn();
const mockPurchaseBillUpdateStatus = vi.fn();
const mockPurchaseBillDelete = vi.fn();
const mockPurchaseBillFindById = vi.fn();
const mockPurchaseBillFindByNumber = vi.fn();
const mockPurchaseBillFindBySupplierInvoice = vi.fn();

vi.mock(
  "../../infrastructure/repositories/prisma-purchase-bill-repository",
  () => ({
    purchaseBillRepository: {
      create: (...args: unknown[]) => mockPurchaseBillCreate(...args),
      update: (...args: unknown[]) => mockPurchaseBillUpdate(...args),
      updateStatus: (...args: unknown[]) =>
        mockPurchaseBillUpdateStatus(...args),
      delete: (...args: unknown[]) => mockPurchaseBillDelete(...args),
      findById: (...args: unknown[]) => mockPurchaseBillFindById(...args),
      findByNumber: (...args: unknown[]) =>
        mockPurchaseBillFindByNumber(...args),
      findBySupplierInvoice: (...args: unknown[]) =>
        mockPurchaseBillFindBySupplierInvoice(...args),
    },
  }),
);

const mockAllocatePurchaseBillNumber = vi.fn();
const mockGetPurchaseSettings = vi.fn();
vi.mock("@/features/purchase-settings", () => ({
  purchaseSettingsRepository: {
    allocateNextPurchaseBillNumber: (...args: unknown[]) =>
      mockAllocatePurchaseBillNumber(...args),
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

const sampleBill: PurchaseBill = {
  id: "pb-123",
  organizationId: "org-test-123",
  billNumber: "PB-0001",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  supplierInvoiceNumber: "INV-2026-118",
  supplierInvoiceDate: "2026-10-12",
  purchaseOrderId: null,
  purchaseOrderNumber: null,
  billDate: "2026-10-14",
  dueDate: "2026-11-13",
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
      id: "pb-item-1",
      purchaseBillId: "pb-123",
      item: "Steel Rods",
      quantity: 10,
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

const validCreateInput = {
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  billDate: "2026-10-14",
  dueDate: "2026-11-13",
  items: [{ item: "Steel Rods", quantity: 10, unitPrice: 100 }],
};

describe("purchase-bill mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const mockTx = {};
      return callback(mockTx);
    });
    mockAllocatePurchaseBillNumber.mockResolvedValue({
      allocatedNumber: "PB-0001",
      sequenceNumber: 1,
    });
    mockGetPurchaseSettings.mockResolvedValue({
      defaultDueDays: 30,
      defaultPaymentTerms: "Net 30 days",
      defaultPurchaseBillNotes: "Bill notes default.",
      defaultPurchaseBillTerms: "Bill terms default.",
    });
    mockPurchaseBillFindByNumber.mockResolvedValue(null);
    mockPurchaseBillFindBySupplierInvoice.mockResolvedValue(null);
    mockSupplierFindById.mockResolvedValue({ id: "sup-1" });
    mockProductFindById.mockResolvedValue({ id: "prod-1" });
    mockPurchaseOrderFindById.mockResolvedValue(null);
  });

  it("creates a purchase bill with the configured PB- number and settings defaults", async () => {
    mockPurchaseBillCreate.mockResolvedValue(sampleBill);

    const result = await createPurchaseBillAction(validCreateInput);

    expect(result.success).toBe(true);
    expect(result.data?.billNumber).toBe("PB-0001");
    expect(mockAllocatePurchaseBillNumber).toHaveBeenCalledWith(
      "org-test-123",
      expect.anything(),
    );
    expect(mockPurchaseBillCreate).toHaveBeenCalled();

    const createInput = mockPurchaseBillCreate.mock.calls[0][1];
    expect(createInput.paymentTerms).toBe("Net 30 days");
    expect(createInput.notes).toBe("Bill notes default.");
    expect(createInput.terms).toBe("Bill terms default.");
  });

  it("links an eligible purchase order and snapshots its number", async () => {
    mockPurchaseOrderFindById.mockResolvedValue({
      id: "po-9",
      orderNumber: "PO-0009",
      status: "Confirmed",
      supplierId: "sup-1",
    });
    mockPurchaseBillCreate.mockResolvedValue({
      ...sampleBill,
      purchaseOrderId: "po-9",
      purchaseOrderNumber: "PO-0009",
    });

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      purchaseOrderId: "po-9",
    });

    expect(result.success).toBe(true);
    expect(result.data?.purchaseOrderNumber).toBe("PO-0009");
    const createInput = mockPurchaseBillCreate.mock.calls[0][1];
    expect(createInput.purchaseOrderId).toBe("po-9");
  });

  it("fails to create a purchase bill on invalid validation input", async () => {
    const result = await createPurchaseBillAction({
      supplierName: "",
      billDate: "not-a-date",
      dueDate: "2026-11-13",
      items: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.fieldErrors).toBeDefined();
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects a due date before the bill date", async () => {
    const result = await createPurchaseBillAction({
      ...validCreateInput,
      dueDate: "2026-10-01",
    });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.dueDate).toBeDefined();
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate internal bill numbers within the organization", async () => {
    mockPurchaseBillFindByNumber.mockResolvedValue(sampleBill);

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      billNumber: "PB-0001",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects a duplicate supplier invoice for the same supplier", async () => {
    mockPurchaseBillFindBySupplierInvoice.mockResolvedValue(sampleBill);

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      supplierInvoiceNumber: "INV-2026-118",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already has a purchase bill");
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
    expect(mockPurchaseBillFindBySupplierInvoice).toHaveBeenCalledWith(
      "org-test-123",
      "sup-1",
      "INV-2026-118",
    );
  });

  it("maps a concurrent duplicate-key violation to a safe duplicate error", async () => {
    mockPurchaseBillCreate.mockRejectedValue({ code: "P2002" });

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      supplierInvoiceNumber: "INV-2026-118",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already has a purchase bill");
    expect(result.error).not.toContain("P2002");
  });

  it("surfaces repository duplicate-invoice errors without leaking internals", async () => {
    const { DuplicateSupplierInvoiceError } = await import(
      "../../domain/errors/purchase-bill-errors"
    );
    mockPurchaseBillCreate.mockRejectedValue(
      new DuplicateSupplierInvoiceError(
        "Shree Balaji Traders",
        "INV-2026-118",
      ),
    );

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      supplierInvoiceNumber: "INV-2026-118",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already has a purchase bill");
  });

  it("updates an existing Draft purchase bill", async () => {
    mockPurchaseBillFindById.mockResolvedValue(sampleBill);
    mockPurchaseBillUpdate.mockResolvedValue({
      ...sampleBill,
      supplierName: "Balaji Global",
    });

    const result = await updatePurchaseBillAction("pb-123", {
      supplierName: "Balaji Global",
    });

    expect(result.success).toBe(true);
    expect(result.data?.supplierName).toBe("Balaji Global");
    expect(mockPurchaseBillUpdate).toHaveBeenCalled();
  });

  it("prevents editing a Confirmed purchase bill", async () => {
    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      status: "Confirmed",
    });

    const result = await updatePurchaseBillAction("pb-123", {
      supplierName: "Changed",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be modified");
    expect(mockPurchaseBillUpdate).not.toHaveBeenCalled();
  });

  it("rejects an update that would move the due date before the bill date", async () => {
    mockPurchaseBillFindById.mockResolvedValue(sampleBill);

    const result = await updatePurchaseBillAction("pb-123", {
      dueDate: "2026-10-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Due date");
    expect(mockPurchaseBillUpdate).not.toHaveBeenCalled();
  });

  it("rejects a duplicate supplier invoice on update excluding itself", async () => {
    mockPurchaseBillFindById.mockResolvedValue(sampleBill);
    mockPurchaseBillFindBySupplierInvoice.mockResolvedValue({
      ...sampleBill,
      id: "pb-other",
    });

    const result = await updatePurchaseBillAction("pb-123", {
      supplierInvoiceNumber: "INV-2026-118",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already has a purchase bill");
    expect(mockPurchaseBillUpdate).not.toHaveBeenCalled();
  });

  it("transitions purchase bill status from Draft to Confirmed", async () => {
    mockPurchaseBillFindById.mockResolvedValue(sampleBill);
    mockPurchaseBillUpdateStatus.mockResolvedValue({
      ...sampleBill,
      status: "Confirmed",
    });

    const result = await transitionPurchaseBillStatusAction(
      "pb-123",
      "Confirmed",
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("Confirmed");
    expect(mockPurchaseBillUpdateStatus).toHaveBeenCalledWith(
      "org-test-123",
      "pb-123",
      "Confirmed",
    );
  });

  it("transitions purchase bill status from Confirmed to Cancelled", async () => {
    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      status: "Confirmed",
    });
    mockPurchaseBillUpdateStatus.mockResolvedValue({
      ...sampleBill,
      status: "Cancelled",
    });

    const result = await transitionPurchaseBillStatusAction(
      "pb-123",
      "Cancelled",
    );

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("Cancelled");
  });

  it("rejects invalid status transitions like Cancelled to Confirmed", async () => {
    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      status: "Cancelled",
    });

    const result = await transitionPurchaseBillStatusAction(
      "pb-123",
      "Confirmed",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
    expect(mockPurchaseBillUpdateStatus).not.toHaveBeenCalled();
  });

  it("deletes a Draft purchase bill", async () => {
    mockPurchaseBillFindById.mockResolvedValue(sampleBill);
    mockPurchaseBillDelete.mockResolvedValue(undefined);

    const result = await deletePurchaseBillAction("pb-123");

    expect(result.success).toBe(true);
    expect(mockPurchaseBillDelete).toHaveBeenCalledWith(
      "org-test-123",
      "pb-123",
    );
  });

  it("refuses to delete a Confirmed purchase bill", async () => {
    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      status: "Confirmed",
    });

    const result = await deletePurchaseBillAction("pb-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be modified");
    expect(mockPurchaseBillDelete).not.toHaveBeenCalled();
  });

  it("rejects a supplier from another organization on create", async () => {
    mockSupplierFindById.mockResolvedValue(null);

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      supplierId: "sup-foreign",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects a product from another organization on create", async () => {
    mockProductFindById.mockResolvedValue(null);

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      items: [
        {
          item: "Steel Rods",
          quantity: 1,
          unitPrice: 100,
          productId: "prod-foreign",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects a purchase order from another organization on create", async () => {
    mockPurchaseOrderFindById.mockResolvedValue(null);

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      purchaseOrderId: "po-foreign",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects linking a cancelled purchase order", async () => {
    mockPurchaseOrderFindById.mockResolvedValue({
      id: "po-9",
      orderNumber: "PO-0009",
      status: "Cancelled",
      supplierId: "sup-1",
    });

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      purchaseOrderId: "po-9",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cancelled");
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects linking a purchase order of a different supplier", async () => {
    mockPurchaseOrderFindById.mockResolvedValue({
      id: "po-9",
      orderNumber: "PO-0009",
      status: "Confirmed",
      supplierId: "sup-other",
    });

    const result = await createPurchaseBillAction({
      ...validCreateInput,
      purchaseOrderId: "po-9",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("supplier");
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("rejects a forged Cancelled status on create", async () => {
    const result = await createPurchaseBillAction({
      ...validCreateInput,
      status: "Cancelled",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.fieldErrors?.status).toBeDefined();
    expect(mockPurchaseBillCreate).not.toHaveBeenCalled();
  });

  it("returns a safe error for a missing document", async () => {
    mockPurchaseBillFindById.mockResolvedValue(null);

    const updateResult = await updatePurchaseBillAction("pb-missing", {
      supplierName: "Changed",
    });
    expect(updateResult.success).toBe(false);
    expect(updateResult.error).toContain("was not found");

    const transitionResult = await transitionPurchaseBillStatusAction(
      "pb-missing",
      "Confirmed",
    );
    expect(transitionResult.success).toBe(false);
    expect(transitionResult.error).toContain("was not found");

    const deleteResult = await deletePurchaseBillAction("pb-missing");
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toContain("was not found");
  });
});
