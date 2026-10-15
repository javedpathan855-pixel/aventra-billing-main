import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  recordSupplierPaymentAction,
  reverseSupplierPaymentAction,
} from "./supplier-payment-mutations";
import type { SupplierPayment } from "../../domain/supplier-payment";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockMemberRole = "owner";
vi.mock("../context/supplier-payment-context", () => ({
  resolveSupplierPaymentContext: vi.fn().mockImplementation(async () => ({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: mockMemberRole,
  })),
}));

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

const mockPaymentCreate = vi.fn();
const mockPaymentFindById = vi.fn();
const mockPaymentFindByIdempotencyKey = vi.fn();
const mockPaymentReverse = vi.fn();
const mockAllocatedTotalForBill = vi.fn();

vi.mock(
  "../../infrastructure/repositories/prisma-supplier-payment-repository",
  () => ({
    supplierPaymentRepository: {
      create: (...args: unknown[]) => mockPaymentCreate(...args),
      findById: (...args: unknown[]) => mockPaymentFindById(...args),
      findByIdempotencyKey: (...args: unknown[]) =>
        mockPaymentFindByIdempotencyKey(...args),
      reverse: (...args: unknown[]) => mockPaymentReverse(...args),
      getActiveAllocatedTotalForBill: (...args: unknown[]) =>
        mockAllocatedTotalForBill(...args),
    },
  }),
);

const mockSupplierFindById = vi.fn();
vi.mock(
  "@/features/suppliers/infrastructure/repositories/prisma-supplier-repository",
  () => ({
    supplierRepository: {
      findById: (...args: unknown[]) => mockSupplierFindById(...args),
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

const mockPrismaTransaction = vi.fn();
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      mockPrismaTransaction(fn),
  }),
}));

const samplePayment: SupplierPayment = {
  id: "spay-123",
  organizationId: "org-test-123",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  amount: 1180,
  currency: "INR (₹)",
  paymentDate: "2026-10-14",
  method: "Bank Transfer",
  reference: "UTR123",
  notes: "",
  status: "Active",
  allocations: [
    {
      id: "spalloc-1",
      purchaseBillId: "pb-1",
      billNumber: "PB-0001",
      amount: 1180,
    },
  ],
};

const sampleBill = {
  id: "pb-1",
  billNumber: "PB-0001",
  status: "Confirmed",
  supplierId: "sup-1",
  total: 1180,
};

const validRecordInput = {
  supplierId: "sup-1",
  amount: 1180,
  paymentDate: "2026-10-14",
  method: "Bank Transfer" as const,
  allocations: [{ purchaseBillId: "pb-1", amount: 1180 }],
};

describe("supplier-payment mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberRole = "owner";
    mockPrismaTransaction.mockImplementation(async (callback) => {
      const mockTx = { $queryRaw: vi.fn().mockResolvedValue([]) };
      return callback(mockTx);
    });
    mockSupplierFindById.mockResolvedValue({ id: "sup-1", name: "Shree Balaji Traders" });
    mockPurchaseBillFindById.mockResolvedValue(sampleBill);
    mockAllocatedTotalForBill.mockResolvedValue(0);
    mockPaymentFindByIdempotencyKey.mockResolvedValue(null);
  });

  it("records a fully allocated payment", async () => {
    mockPaymentCreate.mockResolvedValue(samplePayment);

    const result = await recordSupplierPaymentAction(validRecordInput);

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("spay-123");
    expect(mockPaymentCreate).toHaveBeenCalled();
    const createInput = mockPaymentCreate.mock.calls[0][0];
    expect(createInput.id).toMatch(/^spay_/);
    expect(createInput.allocations[0].id).toMatch(/^spalloc_/);
    expect(createInput.supplierName).toBe("Shree Balaji Traders");
  });

  it("rejects non-admin recording", async () => {
    mockMemberRole = "member";

    const result = await recordSupplierPaymentAction(validRecordInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("owners or admins");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("rejects future payment dates", async () => {
    const result = await recordSupplierPaymentAction({
      ...validRecordInput,
      paymentDate: "2999-01-01",
    });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.paymentDate).toBeDefined();
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("rejects partial allocation totals", async () => {
    const result = await recordSupplierPaymentAction({
      ...validRecordInput,
      amount: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must equal the sum of allocations");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("returns the existing payment for a repeated idempotency key", async () => {
    mockPaymentFindByIdempotencyKey.mockResolvedValue(samplePayment);

    const result = await recordSupplierPaymentAction({
      ...validRecordInput,
      idempotencyKey: "key-1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("spay-123");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("rejects over-allocation beyond the outstanding balance", async () => {
    mockAllocatedTotalForBill.mockResolvedValue(1000);

    const result = await recordSupplierPaymentAction({
      ...validRecordInput,
      amount: 1180,
      allocations: [{ purchaseBillId: "pb-1", amount: 1180 }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("outstanding balance");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("rejects draft bills as ineligible", async () => {
    mockPurchaseBillFindById.mockResolvedValue({ ...sampleBill, status: "Draft" });

    const result = await recordSupplierPaymentAction(validRecordInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Only Confirmed bills");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("rejects bills of a different supplier", async () => {
    mockPurchaseBillFindById.mockResolvedValue({
      ...sampleBill,
      supplierId: "sup-other",
    });

    const result = await recordSupplierPaymentAction(validRecordInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain("belong to the payment supplier");
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("rejects a supplier from another organization", async () => {
    mockSupplierFindById.mockResolvedValue(null);

    const result = await recordSupplierPaymentAction(validRecordInput);

    expect(result.success).toBe(false);
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it("reverses an Active payment", async () => {
    mockPaymentFindById.mockResolvedValue(samplePayment);
    mockPaymentReverse.mockResolvedValue(1);
    mockPaymentFindById.mockResolvedValueOnce(samplePayment).mockResolvedValueOnce({
      ...samplePayment,
      status: "Reversed",
    });

    const result = await reverseSupplierPaymentAction({
      id: "spay-123",
      reason: "Duplicate entry",
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("Reversed");
    expect(mockPaymentReverse).toHaveBeenCalledWith(
      "org-test-123",
      "spay-123",
      expect.objectContaining({ reason: "Duplicate entry" }),
      expect.anything(),
    );
  });

  it("refuses to reverse an already Reversed payment", async () => {
    mockPaymentFindById.mockResolvedValue({
      ...samplePayment,
      status: "Reversed",
    });

    const result = await reverseSupplierPaymentAction({ id: "spay-123" });

    expect(result.success).toBe(false);
    expect(mockPaymentReverse).not.toHaveBeenCalled();
  });

  it("refuses non-admin reversal", async () => {
    mockMemberRole = "member";
    mockPaymentFindById.mockResolvedValue(samplePayment);

    const result = await reverseSupplierPaymentAction({ id: "spay-123" });

    expect(result.success).toBe(false);
    expect(mockPaymentReverse).not.toHaveBeenCalled();
  });

  it("returns a safe error for a missing payment", async () => {
    mockPaymentFindById.mockResolvedValue(null);

    const result = await reverseSupplierPaymentAction({ id: "spay-missing" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("was not found");
  });
});
