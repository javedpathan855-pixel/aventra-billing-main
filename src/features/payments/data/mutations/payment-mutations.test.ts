import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  recordPaymentAction,
  reversePaymentAction,
} from "./payment-mutations";
import { resolvePaymentContext } from "../context/payment-context";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/payment-context", () => ({
  resolvePaymentContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: "owner",
  }),
}));

const mockPaymentCreate = vi.fn();
const mockPaymentFindById = vi.fn();
const mockFindByIdempotencyKey = vi.fn();
const mockGetAllocatedTotal = vi.fn();
const mockPaymentReverse = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-payment-repository", () => ({
  paymentRepository: {
    create: (...args: unknown[]) => mockPaymentCreate(...args),
    findById: (...args: unknown[]) => mockPaymentFindById(...args),
    findByIdempotencyKey: (...args: unknown[]) => mockFindByIdempotencyKey(...args),
    getActiveAllocatedTotalForInvoice: (...args: unknown[]) =>
      mockGetAllocatedTotal(...args),
    reverse: (...args: unknown[]) => mockPaymentReverse(...args),
  },
}));

const mockInvoiceFindById = vi.fn();
vi.mock("@/features/invoices/infrastructure/repositories/prisma-invoice-repository", () => ({
  invoiceRepository: {
    findById: (...args: unknown[]) => mockInvoiceFindById(...args),
  },
}));

const mockCustomerFindById = vi.fn();
vi.mock("@/features/customers/infrastructure/repositories/prisma-customer-repository", () => ({
  customerRepository: {
    findById: (...args: unknown[]) => mockCustomerFindById(...args),
  },
}));

const mockInvoiceUpdate = vi.fn().mockResolvedValue({});
const mockTx = {
  $queryRaw: vi.fn().mockResolvedValue([]),
  invoice: {
    update: (...args: unknown[]) => mockInvoiceUpdate(...args),
  },
};

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return await callback(mockTx);
    }),
  }),
}));

const ownerContext = {
  organizationId: "org-test-123",
  userId: "user-test-456",
  memberRole: "owner",
};

const invoice10000 = {
  id: "inv-1",
  number: "INV-0001",
  customer: "Acme",
  customerId: "cust-1",
  taxMode: "CGST_SGST",
  status: "Issued",
  items: [
    {
      id: "line-1",
      item: "Service",
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      taxRate: 0,
    },
  ],
  amountPaid: 0,
  creditedAmount: 0,
  debitedAmount: 0,
  allocatedCash: 0,
};

const validInput = {
  customerId: "cust-1",
  amount: 4000,
  paymentDate: "2024-01-15",
  method: "UPI" as const,
  allocations: [{ invoiceId: "inv-1", amount: 4000 }],
};

/**
 * Phase 2 mutation enforcement: server-side validation, authorization,
 * org isolation, allocation caps, idempotency, and reversal safety.
 */
describe("payment mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolvePaymentContext).mockResolvedValue({ ...ownerContext });
    mockCustomerFindById.mockResolvedValue({ id: "cust-1", name: "Acme" });
    mockInvoiceFindById.mockResolvedValue({ ...invoice10000 });
    mockGetAllocatedTotal.mockResolvedValue(0);
    mockFindByIdempotencyKey.mockResolvedValue(null);
    mockPaymentCreate.mockImplementation(async (input: Record<string, unknown>) => ({
      ...input,
      id: "pay-1",
      status: "Active",
    }));
  });

  describe("recordPaymentAction", () => {
    it("rejects invalid payloads with field errors and no side effects", async () => {
      const res = await recordPaymentAction({
        ...validInput,
        allocations: [],
      });

      expect(res.success).toBe(false);
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("denies recording to plain members", async () => {
      vi.mocked(resolvePaymentContext).mockResolvedValue({
        ...ownerContext,
        memberRole: "member",
      });

      const res = await recordPaymentAction(validInput);

      expect(res.success).toBe(false);
      expect(res.error).toContain("Only organization owners or admins can record payments");
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("rejects future-dated payments", async () => {
      const res = await recordPaymentAction({ ...validInput, paymentDate: "2999-01-01" });

      expect(res.success).toBe(false);
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("rejects unknown customers without leaking other orgs", async () => {
      mockCustomerFindById.mockResolvedValue(null);

      const res = await recordPaymentAction(validInput);

      expect(res.success).toBe(false);
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("rejects allocations that do not sum to the received amount", async () => {
      const res = await recordPaymentAction({
        ...validInput,
        amount: 5000,
        allocations: [{ invoiceId: "inv-1", amount: 4000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("must fully equal");
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("rejects draft invoices and customer mismatches", async () => {
      mockInvoiceFindById.mockResolvedValue({ ...invoice10000, status: "Draft" });
      const draftRes = await recordPaymentAction(validInput);
      expect(draftRes.success).toBe(false);
      expect(draftRes.error).toContain("cannot receive payments");

      mockInvoiceFindById.mockResolvedValue({ ...invoice10000, customerId: "cust-other" });
      const mismatchRes = await recordPaymentAction(validInput);
      expect(mismatchRes.success).toBe(false);
      expect(mismatchRes.error).toContain("must belong to the payment's customer");
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("rejects over-allocation beyond the outstanding balance", async () => {
      const res = await recordPaymentAction({
        ...validInput,
        amount: 11000,
        allocations: [{ invoiceId: "inv-1", amount: 11000 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("outstanding balance");
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("records a partial payment and derives Partially Paid", async () => {
      const res = await recordPaymentAction(validInput);

      expect(res.success).toBe(true);
      expect(mockPaymentCreate).toHaveBeenCalled();
      expect(mockInvoiceUpdate).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: PrismaInvoiceStatus.PARTIALLY_PAID },
      });
    });

    it("derives Paid on full settlement", async () => {
      const res = await recordPaymentAction({
        ...validInput,
        amount: 10000,
        allocations: [{ invoiceId: "inv-1", amount: 10000 }],
      });

      expect(res.success).toBe(true);
      expect(mockInvoiceUpdate).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: PrismaInvoiceStatus.PAID },
      });
    });

    it("returns the original payment on idempotent retry", async () => {
      const original = { id: "pay-original", status: "Active" };
      mockFindByIdempotencyKey.mockResolvedValue(original);

      const res = await recordPaymentAction({ ...validInput, idempotencyKey: "key-1" });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data).toEqual(original);
      }
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });

    it("hides cross-organization invoices behind not-found", async () => {
      mockInvoiceFindById.mockResolvedValue(null);

      const res = await recordPaymentAction(validInput);

      expect(res.success).toBe(false);
      expect(res.error).toContain("does not exist or does not belong");
      expect(mockPaymentCreate).not.toHaveBeenCalled();
    });
  });

  describe("reversePaymentAction", () => {
    const activePayment = {
      id: "pay-1",
      status: "Active",
      allocations: [{ id: "pa-1", invoiceId: "inv-1", amount: 10000 }],
    };

    beforeEach(() => {
      mockPaymentFindById.mockResolvedValue(activePayment);
      mockPaymentReverse.mockResolvedValue(1);
    });

    it("reverses an active payment and returns the invoice to Issued", async () => {
      mockInvoiceFindById.mockResolvedValue({
        ...invoice10000,
        status: "Paid",
        allocatedCash: 10000,
      });

      const res = await reversePaymentAction({ id: "pay-1", reason: "Duplicate entry" });

      expect(res.success).toBe(true);
      expect(mockPaymentReverse).toHaveBeenCalled();
      expect(mockInvoiceUpdate).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: PrismaInvoiceStatus.ISSUED },
      });
    });

    it("rejects double reversal", async () => {
      mockPaymentReverse.mockResolvedValue(0);

      const res = await reversePaymentAction({ id: "pay-1" });

      expect(res.success).toBe(false);
      expect(res.error).toContain("reverse");
      expect(mockInvoiceUpdate).not.toHaveBeenCalled();
    });

    it("rejects reversing non-active payments and denies members", async () => {
      mockPaymentFindById.mockResolvedValue({ ...activePayment, status: "Reversed" });
      const stateRes = await reversePaymentAction({ id: "pay-1" });
      expect(stateRes.success).toBe(false);

      mockPaymentFindById.mockResolvedValue(activePayment);
      vi.mocked(resolvePaymentContext).mockResolvedValue({
        ...ownerContext,
        memberRole: "member",
      });
      const roleRes = await reversePaymentAction({ id: "pay-1" });
      expect(roleRes.success).toBe(false);
      expect(mockPaymentReverse).not.toHaveBeenCalled();
    });

    it("returns not-found for unknown or foreign payments", async () => {
      mockPaymentFindById.mockResolvedValue(null);

      const res = await reversePaymentAction({ id: "pay-nope" });

      expect(res.success).toBe(false);
      expect(res.error).toContain("was not found");
    });
  });
});
