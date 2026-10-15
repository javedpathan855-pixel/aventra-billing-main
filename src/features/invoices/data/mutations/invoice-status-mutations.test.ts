import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cancelInvoiceAction,
  issueInvoiceAction,
} from "./invoice-mutations";
import { resolveInvoiceContext } from "../context/invoice-context";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/invoice-context", () => ({
  resolveInvoiceContext: vi.fn(),
}));

const mockTxFindUnique = vi.fn();
const mockTxUpdate = vi.fn();
const mockTxQueryRaw = vi.fn().mockResolvedValue([]);
const mockTxCreditFindFirst = vi.fn();
const mockTxDebitFindFirst = vi.fn();
const mockGetAllocatedTotal = vi.fn().mockResolvedValue(0);
vi.mock("@/features/payments/infrastructure/repositories/prisma-payment-repository", () => ({
  paymentRepository: {
    getActiveAllocatedTotalForInvoice: (...args: unknown[]) =>
      mockGetAllocatedTotal(...args),
  },
}));
const mockTx = {
  $queryRaw: (...args: unknown[]) => mockTxQueryRaw(...args),
  invoice: {
    findUnique: (...args: unknown[]) => mockTxFindUnique(...args),
    update: (...args: unknown[]) => mockTxUpdate(...args),
  },
  creditNote: {
    findFirst: (...args: unknown[]) => mockTxCreditFindFirst(...args),
  },
  debitNote: {
    findFirst: (...args: unknown[]) => mockTxDebitFindFirst(...args),
  },
};

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return await callback(mockTx);
    }),
  }),
}));

const mockInvoiceFindById = vi.fn();
vi.mock("../../infrastructure/repositories/prisma-invoice-repository", () => ({
  invoiceRepository: {
    findById: (...args: unknown[]) => mockInvoiceFindById(...args),
  },
}));

const ownerContext = {
  organizationId: "org-test-123",
  userId: "user-test-456",
  memberRole: "owner",
};

const reloadedInvoice = {
  id: "inv-1",
  number: "INV-0001",
  customer: "Acme",
  status: "Issued",
};

/**
 * Phase 1 transition enforcement: dedicated issue/cancel paths with
 * in-transaction re-reads, role gates, and org isolation.
 */
describe("invoice issue and cancel transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveInvoiceContext).mockResolvedValue({ ...ownerContext });
    mockInvoiceFindById.mockResolvedValue(reloadedInvoice);
    mockTxCreditFindFirst.mockResolvedValue(null);
    mockTxDebitFindFirst.mockResolvedValue(null);
  });

  describe("issueInvoiceAction", () => {
    it("issues a draft invoice", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-test-123",
        status: PrismaInvoiceStatus.DRAFT,
      });

      const res = await issueInvoiceAction("inv-1");

      expect(res.success).toBe(true);
      expect(mockTxUpdate).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: PrismaInvoiceStatus.ISSUED },
      });
    });

    it("rejects issuing a non-draft invoice", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-test-123",
        status: PrismaInvoiceStatus.ISSUED,
      });

      const res = await issueInvoiceAction("inv-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Cannot issue invoice");
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("denies issuance to plain members with no side effects", async () => {
      vi.mocked(resolveInvoiceContext).mockResolvedValue({
        ...ownerContext,
        memberRole: "member",
      });

      const res = await issueInvoiceAction("inv-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Only organization owners or admins can issue invoices");
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("does not leak cross-organization invoice existence", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-foreign",
        organizationId: "org-other",
        status: PrismaInvoiceStatus.DRAFT,
      });

      const res = await issueInvoiceAction("inv-foreign");

      expect(res.success).toBe(false);
      expect(res.error).toContain("was not found");
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });
  });

  describe("cancelInvoiceAction", () => {
    it("cancels a clean issued invoice", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-test-123",
        status: PrismaInvoiceStatus.ISSUED,
        amountPaid: 0,
      });

      const res = await cancelInvoiceAction("inv-1");

      expect(res.success).toBe(true);
      expect(mockTxUpdate).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: PrismaInvoiceStatus.CANCELLED },
      });
    });

    it("cancels a clean overdue invoice", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-test-123",
        status: PrismaInvoiceStatus.OVERDUE,
        amountPaid: 0,
      });

      const res = await cancelInvoiceAction("inv-1");

      expect(res.success).toBe(true);
    });

    it("rejects cancelling drafts, paid, and cancelled invoices", async () => {
      for (const status of [
        PrismaInvoiceStatus.DRAFT,
        PrismaInvoiceStatus.PAID,
        PrismaInvoiceStatus.CANCELLED,
        PrismaInvoiceStatus.PARTIALLY_PAID,
      ]) {
        mockTxFindUnique.mockResolvedValue({
          id: "inv-1",
          organizationId: "org-test-123",
          status,
          amountPaid: 0,
        });

        const res = await cancelInvoiceAction("inv-1");

        expect(res.success).toBe(false);
        expect(res.error).toContain("cancel");
      }
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("blocks cancellation with recorded cash", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-test-123",
        status: PrismaInvoiceStatus.ISSUED,
        amountPaid: 5000,
      });

      const res = await cancelInvoiceAction("inv-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("cash payments");
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("blocks cancellation with issued credit or debit notes", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-test-123",
        status: PrismaInvoiceStatus.ISSUED,
        amountPaid: 0,
      });
      mockTxCreditFindFirst.mockResolvedValueOnce({ id: "cn-1" });

      const creditRes = await cancelInvoiceAction("inv-1");
      expect(creditRes.success).toBe(false);
      expect(creditRes.error).toContain("credit notes");

      mockTxDebitFindFirst.mockResolvedValueOnce({ id: "dn-1" });
      const debitRes = await cancelInvoiceAction("inv-1");
      expect(debitRes.success).toBe(false);
      expect(debitRes.error).toContain("debit notes");
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("blocks cancellation with active payment allocations", async () => {
      mockTxFindUnique.mockResolvedValue({
        id: "inv-1",
        organizationId: "org-test-123",
        status: PrismaInvoiceStatus.ISSUED,
        amountPaid: 0,
      });
      mockGetAllocatedTotal.mockResolvedValueOnce(2500);

      const res = await cancelInvoiceAction("inv-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("payment allocations");
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it("denies cancellation to plain members", async () => {
      vi.mocked(resolveInvoiceContext).mockResolvedValue({
        ...ownerContext,
        memberRole: "member",
      });

      const res = await cancelInvoiceAction("inv-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Only organization owners or admins can cancel invoices");
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });
  });
});
