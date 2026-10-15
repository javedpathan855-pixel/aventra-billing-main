import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEstimateAction,
  updateEstimateAction,
  transitionEstimateStatusAction,
  deleteEstimateAction,
  convertEstimateToInvoiceAction,
} from "./estimate-mutations";
import type { Estimate } from "../../domain/entities/estimate";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockMemberRole = "owner";

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/estimate-context", () => ({
  resolveEstimateContext: vi.fn().mockImplementation(async () => ({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: mockMemberRole,
  })),
}));

const mockEstimateCreate = vi.fn();
const mockEstimateUpdate = vi.fn();
const mockEstimateUpdateStatus = vi.fn();
const mockEstimateDelete = vi.fn();
const mockEstimateFindById = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-estimate-repository", () => ({
  estimateRepository: {
    create: (...args: unknown[]) => mockEstimateCreate(...args),
    update: (...args: unknown[]) => mockEstimateUpdate(...args),
    updateStatus: (...args: unknown[]) => mockEstimateUpdateStatus(...args),
    delete: (...args: unknown[]) => mockEstimateDelete(...args),
    findById: (...args: unknown[]) => mockEstimateFindById(...args),
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

const mockAllocateEstimateNumber = vi.fn();
vi.mock("@/features/sales-settings", () => ({
  salesSettingsRepository: {
    allocateNextNumber: (...args: unknown[]) =>
      mockAllocateEstimateNumber(...args),
  },
}));

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

vi.mock("@/features/invoices/data/queries/get-supplier-tax-context", () => ({
  getSupplierTaxContext: vi.fn().mockResolvedValue({
    state: "27-Maharashtra",
    gstNumber: "27AABCA1234A1Z5",
    organizationName: "Test Org",
  }),
}));

const mockPrismaTransaction = vi.fn();
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      mockPrismaTransaction(fn),
  }),
}));

describe("estimate mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberRole = "owner";
    mockAllocateEstimateNumber.mockResolvedValue({
      allocatedNumber: "EST-0001",
      sequenceNumber: 1,
    });
    mockAllocateInvoiceNumber.mockResolvedValue({
      allocatedNumber: "INV-0001",
      sequenceNumber: 1,
    });
    mockCustomerFindById.mockResolvedValue({
      id: "cust-1",
      name: "Acme Corp",
      email: "acme@example.com",
      gstin: "27AABCA1234A1Z5",
      placeOfSupply: "27-Maharashtra",
      billingAddress: {
        addressLine1: "123 Business St",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400001",
        country: "India",
      },
    });
  });

  it("creates an estimate draft successfully with server-computed totals and allocated number", async () => {
    mockEstimateCreate.mockImplementation(async (data) => ({
      ...data,
      id: "est-123",
      customer: data.customerName,
    }));
    const mockTx = { tx: "estimate-create-tx" };
    mockPrismaTransaction.mockImplementation(async (callback) =>
      callback(mockTx),
    );

    const result = await createEstimateAction({
      customerId: "cust-1",
      customerName: "Acme Corp",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      taxMode: "CGST_SGST",
      items: [
        {
          item: "Consulting",
          description: "Technical consulting",
          quantity: 2,
          unitPrice: 10000,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockAllocateEstimateNumber).toHaveBeenCalledWith(
      "org-test-123",
      mockTx,
    );
    expect(mockEstimateCreate).toHaveBeenCalled();
    const createdData = mockEstimateCreate.mock.calls[0][0];
    expect(createdData.estimateNumber).toBe("EST-0001");
    expect(createdData.subtotal).toBe(20000);
    expect(createdData.taxableAmount).toBe(20000);
    expect(createdData.total).toBe(23600); // 20,000 + 18% GST (3,600)
    // Numbering and persistence share one transaction: no burned numbers.
    expect(mockEstimateCreate.mock.calls[0][1]).toBe(mockTx);
  });

  it("fails to create estimate if customer validation fails", async () => {
    mockCustomerFindById.mockResolvedValue(null);

    const result = await createEstimateAction({
      customerId: "non-existent-cust",
      customerName: "Acme Corp",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      items: [
        {
          item: "Consulting",
          description: "",
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist in this organization");
  });

  it("updates an existing draft estimate", async () => {
    const existingDraft: Estimate = {
      id: "est-1",
      estimateNumber: "EST-0001",
      customer: "Acme Corp",
      customerEmail: "acme@example.com",
      customerAddress: "Mumbai",
      customerGstin: "27AABCA1234A1Z5",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      taxMode: "CGST_SGST",
      notes: "",
      terms: "",
      items: [],
    };
    mockEstimateFindById.mockResolvedValue(existingDraft);
    mockEstimateUpdate.mockImplementation(async (_org, _id, data) => ({
      ...data,
      id: "est-1",
      customer: data.customerName,
    }));

    const result = await updateEstimateAction({
      id: "est-1",
      customerName: "Acme Corp Updated",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      items: [
        {
          item: "Implementation",
          description: "Full service",
          quantity: 1,
          unitPrice: 50000,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockEstimateUpdate).toHaveBeenCalled();
  });

  it("prevents updating non-draft estimates (e.g. Sent or Converted)", async () => {
    const sentEstimate: Estimate = {
      id: "est-2",
      estimateNumber: "EST-0002",
      customer: "Acme Corp",
      customerEmail: "",
      customerAddress: "",
      customerGstin: "",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Sent",
      taxMode: "CGST_SGST",
      notes: "",
      terms: "",
      items: [],
    };
    mockEstimateFindById.mockResolvedValue(sentEstimate);

    const result = await updateEstimateAction({
      id: "est-2",
      customerName: "Acme Corp Updated",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      items: [
        {
          item: "Implementation",
          description: "",
          quantity: 1,
          unitPrice: 50000,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Only draft estimates can be modified");
  });

  it("transitions status across the valid lifecycle and blocks invalid jumps", async () => {
    const draft: Estimate = {
      id: "est-1",
      estimateNumber: "EST-0001",
      customer: "Acme Corp",
      customerEmail: "",
      customerAddress: "",
      customerGstin: "",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      taxMode: "CGST_SGST",
      notes: "",
      terms: "",
      items: [],
    };
    mockEstimateFindById.mockResolvedValue(draft);
    mockEstimateUpdateStatus.mockResolvedValue({ ...draft, status: "Sent" });

    // Draft -> Sent is allowed
    const sendResult = await transitionEstimateStatusAction("est-1", "Sent");
    expect(sendResult.success).toBe(true);

    // Draft -> Accepted is NOT allowed (must be Sent first)
    const invalidResult = await transitionEstimateStatusAction(
      "est-1",
      "Accepted",
    );
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain("Cannot transition estimate");
  });

  it("enforces admin role for deleting draft estimates", async () => {
    mockMemberRole = "member";
    const draft: Estimate = {
      id: "est-1",
      estimateNumber: "EST-0001",
      customer: "Acme Corp",
      customerEmail: "",
      customerAddress: "",
      customerGstin: "",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      taxMode: "CGST_SGST",
      notes: "",
      terms: "",
      items: [],
    };
    mockEstimateFindById.mockResolvedValue(draft);

    const result = await deleteEstimateAction("est-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "Only organization owners or admins can delete estimates",
    );
  });

  it("converts an accepted estimate to an invoice via atomic transaction", async () => {
    const acceptedEstimate: Estimate = {
      id: "est-1",
      estimateNumber: "EST-0001",
      customer: "Acme Corp",
      customerEmail: "acme@example.com",
      customerAddress: "Mumbai",
      customerGstin: "27AABCA1234A1Z5",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Accepted",
      taxMode: "CGST_SGST",
      notes: "Proposal notes",
      terms: "Payment terms",
      items: [
        {
          id: "item-1",
          item: "Consulting",
          description: "Technical consulting",
          quantity: 2,
          unitPrice: 10000,
          discount: 0,
          taxRate: 18,
        },
      ],
    };

    mockEstimateFindById.mockResolvedValue(acceptedEstimate);

    mockPrismaTransaction.mockImplementation(async (callback) => {
      const mockTx = {
        estimate: {
          findUnique: vi.fn().mockResolvedValue({
            id: acceptedEstimate.id,
            estimateNumber: acceptedEstimate.estimateNumber,
            customerName: acceptedEstimate.customer,
            customerEmail: acceptedEstimate.customerEmail,
            customerAddress: acceptedEstimate.customerAddress,
            customerGstin: acceptedEstimate.customerGstin,
            taxMode: acceptedEstimate.taxMode,
            currency: "INR (₹)",
            notes: acceptedEstimate.notes,
            terms: acceptedEstimate.terms,
            convertedToInvoiceId: null,
            items: acceptedEstimate.items.map((it) => ({
              ...it,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: it.discount,
              taxRate: it.taxRate,
            })),
          }),
        },
      };

      mockInvoiceCreate.mockResolvedValue({
        id: "inv-999",
        number: "INV-0001",
      });

      mockEstimateUpdateStatus.mockResolvedValue({
        ...acceptedEstimate,
        status: "Converted",
        convertedToInvoiceId: "inv-999",
      });

      return callback(mockTx);
    });

    const result = await convertEstimateToInvoiceAction("est-1");

    expect(result.success).toBe(true);
    expect(result.data?.invoiceId).toBe("inv-999");
    expect(result.data?.invoiceNumber).toBe("INV-0001");
    expect(result.data?.estimate.status).toBe("Converted");
    expect(mockAllocateInvoiceNumber).toHaveBeenCalledWith(
      "org-test-123",
      "INVOICE",
      expect.anything(),
    );
  });

  it("prevents duplicate conversion of an already converted estimate", async () => {
    const alreadyConverted: Estimate = {
      id: "est-1",
      estimateNumber: "EST-0001",
      customer: "Acme Corp",
      customerEmail: "",
      customerAddress: "",
      customerGstin: "",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Converted",
      taxMode: "CGST_SGST",
      notes: "",
      terms: "",
      items: [],
      convertedToInvoiceId: "inv-existing-123",
    };

    mockEstimateFindById.mockResolvedValue(alreadyConverted);

    const result = await convertEstimateToInvoiceAction("est-1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition estimate");
  });

  it("rejects a forged Converted status on create", async () => {
    const result = await createEstimateAction({
      customerName: "Acme Corp",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Converted",
      items: [
        {
          item: "Consulting",
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          taxRate: 18,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(result.fieldErrors?.status).toBeDefined();
    expect(mockEstimateCreate).not.toHaveBeenCalled();
  });

  it("rejects a product from another organization on create", async () => {
    mockProductFindById.mockResolvedValue(null);

    const result = await createEstimateAction({
      customerName: "Acme Corp",
      issueDate: "2026-10-14",
      validUntil: "2026-11-14",
      status: "Draft",
      items: [
        {
          item: "Consulting",
          quantity: 1,
          unitPrice: 5000,
          discount: 0,
          taxRate: 18,
          productId: "prod-foreign",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist in this organization");
    expect(mockProductFindById).toHaveBeenCalledWith(
      "org-test-123",
      "prod-foreign",
    );
    expect(mockEstimateCreate).not.toHaveBeenCalled();
  });
});
