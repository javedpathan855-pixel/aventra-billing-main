import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSalesOrderAction,
  updateSalesOrderAction,
  transitionSalesOrderStatusAction,
  deleteSalesOrderAction,
  recordFulfilmentAction,
  convertSalesOrderToInvoiceAction,
} from "./sales-order-mutations";
import type { SalesOrder } from "../../domain/entities/sales-order";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockMemberRole = "owner";

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/sales-order-context", () => ({
  resolveSalesOrderContext: vi.fn().mockImplementation(async () => ({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: mockMemberRole,
  })),
}));

const mockSalesOrderCreate = vi.fn();
const mockSalesOrderUpdate = vi.fn();
const mockSalesOrderUpdateStatus = vi.fn();
const mockSalesOrderDelete = vi.fn();
const mockSalesOrderFindById = vi.fn();
const mockUpdateItemFulfilment = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-sales-order-repository", () => ({
  salesOrderRepository: {
    create: (...args: unknown[]) => mockSalesOrderCreate(...args),
    update: (...args: unknown[]) => mockSalesOrderUpdate(...args),
    updateStatus: (...args: unknown[]) => mockSalesOrderUpdateStatus(...args),
    delete: (...args: unknown[]) => mockSalesOrderDelete(...args),
    findById: (...args: unknown[]) => mockSalesOrderFindById(...args),
    updateItemFulfilment: (...args: unknown[]) => mockUpdateItemFulfilment(...args),
  },
}));

const mockAllocateSalesOrderNumber = vi.fn();
vi.mock("@/features/sales-settings", () => ({
  salesSettingsRepository: {
    allocateNextSalesOrderNumber: (...args: unknown[]) =>
      mockAllocateSalesOrderNumber(...args),
    getSettings: vi.fn().mockResolvedValue({
      defaultDeliveryDays: 15,
      defaultSalesOrderNotes: null,
      defaultSalesOrderTerms: null,
    }),
  },
}));

const mockCustomerFindById = vi.fn();
vi.mock(
  "@/features/customers/infrastructure/repositories/prisma-customer-repository",
  () => ({
    customerRepository: {
      findById: (...args: unknown[]) => mockCustomerFindById(...args),
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

const mockEstimateFindById = vi.fn();
vi.mock(
  "@/features/estimates/infrastructure/repositories/prisma-estimate-repository",
  () => ({
    estimateRepository: {
      findById: (...args: unknown[]) => mockEstimateFindById(...args),
    },
  }),
);

const mockAllocateInvoiceNumber = vi.fn();
vi.mock("@/features/billing-settings", () => ({
  billingSettingsRepository: {
    allocateNextNumber: (...args: unknown[]) =>
      mockAllocateInvoiceNumber(...args),
  },
}));

const mockInvoiceCreate = vi.fn();
vi.mock(
  "@/features/invoices/infrastructure/repositories/prisma-invoice-repository",
  () => ({
    invoiceRepository: {
      create: (...args: unknown[]) => mockInvoiceCreate(...args),
    },
  }),
);

const mockPrismaTransaction = vi.fn();
const mockFindUnique = vi.fn();
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      mockPrismaTransaction(fn),
    salesOrder: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  }),
}));

const sampleOrder: SalesOrder = {
  id: "so-123",
  organizationId: "org-test-123",
  orderNumber: "SO-0001",
  customerName: "Acme Corp",
  orderDate: "2026-10-14",
  expectedDeliveryDate: "2026-10-29",
  status: "Draft",
  taxMode: "CGST_SGST",
  currency: "INR (₹)",
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
      id: "so-item-1",
      salesOrderId: "so-123",
      item: "Widgets",
      quantity: 10,
      fulfilledQuantity: 0,
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

describe("sales-order mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberRole = "owner";
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        salesOrder: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };
      return callback(mockTx);
    });
    mockAllocateSalesOrderNumber.mockResolvedValue({
      allocatedNumber: "SO-0001",
      sequenceNumber: 1,
    });
  });

  it("creates a sales order with valid inputs and allocated order number", async () => {
    mockSalesOrderCreate.mockResolvedValue(sampleOrder);

    const result = await createSalesOrderAction({
      customerName: "Acme Corp",
      orderDate: "2026-10-14",
      items: [
        {
          item: "Widgets",
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.orderNumber).toBe("SO-0001");
    expect(mockSalesOrderCreate).toHaveBeenCalled();
  });

  it("fails to create sales order on invalid validation input", async () => {
    const result = await createSalesOrderAction({
      customerName: "",
      orderDate: "not-a-date",
      items: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.fieldErrors).toBeDefined();
    expect(mockSalesOrderCreate).not.toHaveBeenCalled();
  });

  it("updates an existing Draft sales order", async () => {
    mockSalesOrderFindById.mockResolvedValue(sampleOrder);
    mockSalesOrderUpdate.mockResolvedValue({
      ...sampleOrder,
      customerName: "Acme Global",
    });

    const result = await updateSalesOrderAction("so-123", {
      customerName: "Acme Global",
    });

    expect(result.success).toBe(true);
    expect(result.data?.customerName).toBe("Acme Global");
    expect(mockSalesOrderUpdate).toHaveBeenCalled();
  });

  it("prevents editing a Confirmed or Fulfilled sales order", async () => {
    mockSalesOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    const result = await updateSalesOrderAction("so-123", {
      customerName: "Changed",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be modified");
    expect(mockSalesOrderUpdate).not.toHaveBeenCalled();
  });

  it("transitions sales order status from Draft to Confirmed", async () => {
    mockSalesOrderFindById.mockResolvedValue(sampleOrder);
    mockSalesOrderUpdateStatus.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    const result = await transitionSalesOrderStatusAction("so-123", "Confirmed");

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("Confirmed");
    expect(mockSalesOrderUpdateStatus).toHaveBeenCalledWith(
      "org-test-123",
      "so-123",
      "Confirmed",
    );
  });

  it("rejects invalid status transitions like Cancelled to Confirmed", async () => {
    mockSalesOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Cancelled",
    });

    const result = await transitionSalesOrderStatusAction("so-123", "Confirmed");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
    expect(mockSalesOrderUpdateStatus).not.toHaveBeenCalled();
  });

  it("deletes a Draft sales order", async () => {
    mockSalesOrderFindById.mockResolvedValue(sampleOrder);
    mockSalesOrderDelete.mockResolvedValue(undefined);

    const result = await deleteSalesOrderAction("so-123");

    expect(result.success).toBe(true);
    expect(mockSalesOrderDelete).toHaveBeenCalledWith("org-test-123", "so-123");
  });

  it("refuses to delete a Confirmed sales order", async () => {
    mockSalesOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    const result = await deleteSalesOrderAction("so-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be modified");
    expect(mockSalesOrderDelete).not.toHaveBeenCalled();
  });

  it("records fulfilment and blocks over-fulfilment", async () => {
    mockSalesOrderFindById.mockResolvedValue({
      ...sampleOrder,
      status: "Confirmed",
    });

    // Over-fulfilment attempt (12 > 10)
    const failResult = await recordFulfilmentAction("so-123", {
      items: [{ id: "so-item-1", fulfilledQuantity: 12 }],
    });

    expect(failResult.success).toBe(false);
    expect(failResult.error).toContain("cannot exceed ordered quantity");

    // Valid fulfilment
    mockUpdateItemFulfilment.mockResolvedValue({
      ...sampleOrder,
      status: "PartiallyFulfilled",
      items: [
        {
          ...sampleOrder.items[0],
          fulfilledQuantity: 5,
          remainingQuantity: 5,
        },
      ],
    });

    const successResult = await recordFulfilmentAction("so-123", {
      items: [{ id: "so-item-1", fulfilledQuantity: 5 }],
    });

    expect(successResult.success).toBe(true);
    expect(successResult.data?.status).toBe("PartiallyFulfilled");
  });

  it("blocks converting an already-invoiced sales order a second time", async () => {
    const invoicedOrder = {
      ...sampleOrder,
      status: "CONFIRMED",
      invoices: [{ id: "inv-1" }],
    };
    mockPrismaTransaction.mockImplementationOnce(async (callback) => {
      const mockTx = {
        salesOrder: {
          findFirst: vi.fn().mockResolvedValue(invoicedOrder),
        },
      };
      return callback(mockTx);
    });

    const result = await convertSalesOrderToInvoiceAction("so-123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("already been converted");
    expect(mockAllocateInvoiceNumber).not.toHaveBeenCalled();
    expect(mockInvoiceCreate).not.toHaveBeenCalled();
  });

  it("rejects a customer from another organization on create", async () => {
    mockCustomerFindById.mockResolvedValue(null);

    const result = await createSalesOrderAction({
      customerId: "cust-foreign",
      customerName: "Foreign Corp",
      orderDate: "2026-10-14",
      items: [{ item: "Widgets", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockCustomerFindById).toHaveBeenCalledWith(
      "org-test-123",
      "cust-foreign",
    );
    expect(mockSalesOrderCreate).not.toHaveBeenCalled();
  });

  it("rejects a product from another organization on create", async () => {
    mockProductFindById.mockResolvedValue(null);

    const result = await createSalesOrderAction({
      customerName: "Acme Corp",
      orderDate: "2026-10-14",
      items: [
        { item: "Widgets", quantity: 1, unitPrice: 100, productId: "prod-foreign" },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockProductFindById).toHaveBeenCalledWith(
      "org-test-123",
      "prod-foreign",
    );
    expect(mockSalesOrderCreate).not.toHaveBeenCalled();
  });

  it("rejects an unknown source quotation on create", async () => {
    mockEstimateFindById.mockResolvedValue(null);

    const result = await createSalesOrderAction({
      customerName: "Acme Corp",
      orderDate: "2026-10-14",
      sourceEstimateId: "est-foreign",
      items: [{ item: "Widgets", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in this organization");
    expect(mockSalesOrderCreate).not.toHaveBeenCalled();
  });

  it("rejects an already-converted source quotation on create", async () => {
    mockEstimateFindById.mockResolvedValue({
      id: "est-9",
      status: "Accepted",
      convertedToSalesOrderId: "so-9",
    });

    const result = await createSalesOrderAction({
      customerName: "Acme Corp",
      orderDate: "2026-10-14",
      sourceEstimateId: "est-9",
      items: [{ item: "Widgets", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("already converted");
    expect(mockSalesOrderCreate).not.toHaveBeenCalled();
  });

  it("rejects a forged Fulfilled status on create", async () => {
    const result = await createSalesOrderAction({
      customerName: "Acme Corp",
      orderDate: "2026-10-14",
      status: "Fulfilled",
      items: [{ item: "Widgets", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.fieldErrors?.status).toBeDefined();
    expect(mockSalesOrderCreate).not.toHaveBeenCalled();
  });
});
