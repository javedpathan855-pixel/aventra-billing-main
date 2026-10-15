import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createDebitNoteAction,
  updateDebitNoteAction,
  issueDebitNoteAction,
  deleteDebitNoteAction,
} from "./debit-note-mutations";
import { resolveDebitNoteContext } from "../context/debit-note-context";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/debit-note-context", () => ({
  resolveDebitNoteContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: "owner",
  }),
}));

const mockDebitNoteCreate = vi.fn();
const mockDebitNoteUpdate = vi.fn();
const mockDebitNoteDelete = vi.fn();
const mockDebitNoteFindById = vi.fn();
const mockGetIssuedTotalForInvoice = vi.fn();

vi.mock("../../infrastructure/repositories/prisma-debit-note-repository", () => ({
  debitNoteRepository: {
    create: (...args: unknown[]) => mockDebitNoteCreate(...args),
    update: (...args: unknown[]) => mockDebitNoteUpdate(...args),
    delete: (...args: unknown[]) => mockDebitNoteDelete(...args),
    findById: (...args: unknown[]) => mockDebitNoteFindById(...args),
    getIssuedTotalForInvoice: (...args: unknown[]) => mockGetIssuedTotalForInvoice(...args),
  },
}));

const mockInvoiceFindById = vi.fn();
vi.mock("@/features/invoices/infrastructure/repositories/prisma-invoice-repository", () => ({
  invoiceRepository: {
    findById: (...args: unknown[]) => mockInvoiceFindById(...args),
  },
}));

const mockAllocateNextNumber = vi.fn();
const mockGetSettings = vi.fn();
vi.mock("@/features/billing-settings", () => ({
  billingSettingsRepository: {
    allocateNextNumber: (...args: unknown[]) => mockAllocateNextNumber(...args),
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
  },
}));

const mockInvoiceUpdate = vi.fn().mockResolvedValue({});
const mockTx = {
  $queryRaw: vi.fn().mockResolvedValue([]),
  debitNote: {
    // Number-conflict lookups find nothing; in-tx draft re-reads see Draft.
    findUnique: vi.fn().mockImplementation((args?: { where?: Record<string, unknown> }) =>
      args?.where && "id" in args.where
        ? { status: "DRAFT", organizationId: "org-test-123" }
        : null,
    ),
  },
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

describe("Debit Note Server Mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      prefix: "DN-",
      suffix: "",
      padding: 4,
      nextNumber: 1,
      defaultNotes: null,
      defaultTerms: null,
    });
    mockAllocateNextNumber.mockResolvedValue({
      allocatedNumber: "DN-0001",
      nextNumber: 2,
    });
  });

  const sampleEligibleInvoice = {
    id: "inv-eligible-1",
    number: "INV-2026-0001",
    customer: "Acme Enterprises",
    customerId: "cust-1",
    customerEmail: "billing@acme.com",
    customerAddress: "Mumbai, MH",
    customerGstin: "27ABCDE1234F1Z5",
    customerPlaceOfSupply: "27-Maharashtra",
    issueDate: "2026-10-10",
    dueDate: "2026-10-25",
    status: "Issued" as const,
    taxMode: "CGST_SGST" as const,
    currency: "INR (₹)",
    subtotal: 100000,
    lineDiscountTotal: 0,
    additionalDiscount: 0,
    additionalCharges: 0,
    taxableAmount: 100000,
    cgst: 9000,
    sgst: 9000,
    igst: 0,
    totalTax: 18000,
    total: 118000,
    amountPaid: 0,
    items: [
      {
        id: "inv-item-1",
        item: "Web Platform Development",
        quantity: 1,
        unitPrice: 100000,
        discount: 0,
        taxRate: 18,
      },
    ],
  };

  describe("createDebitNoteAction", () => {
    it("returns validation failure when reason or items are missing", async () => {
      const res = await createDebitNoteAction({
        invoiceId: "inv-1",
        issueDate: "2026-10-15",
        status: "Draft",
        reason: "",
        items: [],
      });

      expect(res.success).toBe(false);
      expect(mockDebitNoteCreate).not.toHaveBeenCalled();
    });

    it("rejects debits against ineligible invoices", async () => {
      mockInvoiceFindById.mockResolvedValue({ ...sampleEligibleInvoice, status: "Draft" });

      const res = await createDebitNoteAction({
        invoiceId: "inv-eligible-1",
        issueDate: "2026-10-15",
        status: "Draft",
        reason: "Correction",
        items: [{ item: "Item 1", quantity: 1, unitPrice: 100, discount: 0, taxRate: 18 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("ineligible for debit");
      expect(mockDebitNoteCreate).not.toHaveBeenCalled();
    });

    it("rejects debits exceeding the remaining debitable cap", async () => {
      mockInvoiceFindById.mockResolvedValue({
        ...sampleEligibleInvoice,
        items: [{ id: "it-1", item: "Service", quantity: 1, unitPrice: 10000, discount: 0, taxRate: 18 }],
      });
      mockGetIssuedTotalForInvoice.mockResolvedValue(10000);

      const res = await createDebitNoteAction({
        invoiceId: "inv-eligible-1",
        issueDate: "2026-10-15",
        status: "Issued",
        reason: "Over-debit attempt",
        items: [{ item: "Service", quantity: 1, unitPrice: 5000, discount: 0, taxRate: 18 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("exceeds remaining debitable balance");
      expect(mockInvoiceUpdate).not.toHaveBeenCalled();
    });

    it("does not touch the invoice on Draft creation", async () => {
      mockInvoiceFindById.mockResolvedValue(sampleEligibleInvoice);
      mockGetIssuedTotalForInvoice.mockResolvedValue(0);
      mockDebitNoteCreate.mockImplementation(async (payload) => ({ ...payload, id: "dn-draft-1" }));

      const res = await createDebitNoteAction({
        invoiceId: "inv-eligible-1",
        issueDate: "2026-10-15",
        status: "Draft",
        reason: "Pending review",
        items: [{ item: "Item 1", quantity: 1, unitPrice: 100, discount: 0, taxRate: 18 }],
      });

      expect(res.success).toBe(true);
      expect(mockInvoiceUpdate).not.toHaveBeenCalled();
    });

    it("derives Partially Paid when a debit raises a paid invoice's balance", async () => {
      mockInvoiceFindById.mockResolvedValue({
        ...sampleEligibleInvoice,
        status: "Paid",
        amountPaid: 118000,
      });
      mockGetIssuedTotalForInvoice.mockResolvedValue(0);
      mockDebitNoteCreate.mockImplementation(async (payload) => ({ ...payload, id: "dn-paid-1" }));

      const res = await createDebitNoteAction({
        invoiceId: "inv-eligible-1",
        issueDate: "2026-10-15",
        status: "Issued",
        reason: "Additional charges",
        items: [{ item: "Extra", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
      });

      expect(res.success).toBe(true);
      expect(mockInvoiceUpdate).toHaveBeenCalledWith({
        where: { id: "inv-eligible-1" },
        data: { status: PrismaInvoiceStatus.PARTIALLY_PAID },
      });
    });

    it("never marks an invoice PAID because of a debit", async () => {
      mockInvoiceFindById.mockResolvedValue(sampleEligibleInvoice);
      mockGetIssuedTotalForInvoice.mockResolvedValue(0);
      mockDebitNoteCreate.mockImplementation(async (payload) => ({ ...payload, id: "dn-iss-1" }));

      const res = await createDebitNoteAction({
        invoiceId: "inv-eligible-1",
        issueDate: "2026-10-15",
        status: "Issued",
        reason: "Additional charges",
        items: [{ item: "Extra", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 }],
      });

      expect(res.success).toBe(true);
      const statuses = mockInvoiceUpdate.mock.calls.map((call) => (call[0] as { data: { status: unknown } }).data.status);
      expect(statuses).not.toContain(PrismaInvoiceStatus.PAID);
    });
  });

  describe("updateDebitNoteAction", () => {
    it("rejects editing a non-draft note", async () => {
      mockDebitNoteFindById.mockResolvedValue({
        id: "dn-issued-1",
        debitNoteNumber: "DN-0001",
        status: "Issued",
        invoiceId: "inv-eligible-1",
      });

      const res = await updateDebitNoteAction({
        id: "dn-issued-1",
        issueDate: "2026-10-15",
        status: "Issued",
        reason: "Edit attempt",
        items: [{ item: "Item 1", quantity: 1, unitPrice: 100, discount: 0, taxRate: 18 }],
      });

      expect(res.success).toBe(false);
      expect(mockDebitNoteUpdate).not.toHaveBeenCalled();
    });
  });

  describe("issueDebitNoteAction", () => {
    it("issues a draft debit note successfully after availability check", async () => {
      mockDebitNoteFindById.mockResolvedValue({
        id: "dn-draft-1",
        debitNoteNumber: "DN-0001",
        invoiceId: "inv-eligible-1",
        customerId: "cust-1",
        customerName: "Acme",
        issueDate: "2026-10-15",
        status: "Draft",
        reason: "Correction",
        taxMode: "CGST_SGST",
        currency: "INR (₹)",
        subtotal: 1000,
        lineDiscountTotal: 0,
        taxableAmount: 1000,
        cgst: 90,
        sgst: 90,
        igst: 0,
        totalTax: 180,
        total: 1180,
        notes: null,
        terms: null,
        items: [
          { id: "dn-item-1", item: "Extra", quantity: 1, unitPrice: 1000, discount: 0, taxRate: 18 },
        ],
      });
      mockInvoiceFindById.mockResolvedValue(sampleEligibleInvoice);
      mockGetIssuedTotalForInvoice.mockResolvedValue(0);
      mockDebitNoteUpdate.mockImplementation(async (_orgId, _id, payload) => ({
        ...payload,
        id: "dn-draft-1",
      }));

      const res = await issueDebitNoteAction("dn-draft-1");

      expect(res.success).toBe(true);
      expect(mockDebitNoteUpdate).toHaveBeenCalled();
    });

    it("rejects issuing a non-draft note", async () => {
      mockDebitNoteFindById.mockResolvedValue({
        id: "dn-issued-1",
        status: "Issued",
        invoiceId: "inv-1",
      });

      const res = await issueDebitNoteAction("dn-issued-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Cannot perform operation 'issue'");
    });
  });

  describe("deleteDebitNoteAction", () => {
    it("deletes a draft debit note", async () => {
      mockDebitNoteFindById.mockResolvedValue({
        id: "dn-draft-1",
        invoiceId: sampleEligibleInvoice.id,
        status: "Draft",
      });
      mockDebitNoteDelete.mockResolvedValue(1);

      const res = await deleteDebitNoteAction("dn-draft-1");

      expect(res.success).toBe(true);
      expect(mockDebitNoteDelete).toHaveBeenCalledWith("org-test-123", "dn-draft-1");
    });

    it("rejects deleting an issued debit note", async () => {
      mockDebitNoteFindById.mockResolvedValue({
        id: "dn-issued-1",
        invoiceId: sampleEligibleInvoice.id,
        status: "Issued",
      });

      const res = await deleteDebitNoteAction("dn-issued-1");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Cannot perform operation 'delete'");
      expect(mockDebitNoteDelete).not.toHaveBeenCalled();
    });
  });

  describe("debit note authorization", () => {
    it("denies issuing a debit note to a plain member", async () => {
      vi.mocked(resolveDebitNoteContext).mockResolvedValueOnce({
        organizationId: "org-test-123",
        userId: "user-member",
        memberRole: "member",
      });
      mockDebitNoteFindById.mockResolvedValue({
        id: "dn-draft-x",
        invoiceId: sampleEligibleInvoice.id,
        status: "Draft",
      });

      const res = await issueDebitNoteAction("dn-draft-x");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Only organization owners or admins can issue debit notes");
    });

    it("denies creating an already-issued debit note to a plain member", async () => {
      vi.mocked(resolveDebitNoteContext).mockResolvedValueOnce({
        organizationId: "org-test-123",
        userId: "user-member",
        memberRole: "member",
      });

      const res = await createDebitNoteAction({
        invoiceId: sampleEligibleInvoice.id,
        issueDate: "2026-10-15",
        status: "Issued",
        reason: "Correction",
        items: [{ item: "Item 1", quantity: 1, unitPrice: 100, discount: 0, taxRate: 18 }],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Only organization owners or admins can issue debit notes");
    });

    it("denies deleting a debit note to a plain member", async () => {
      vi.mocked(resolveDebitNoteContext).mockResolvedValueOnce({
        organizationId: "org-test-123",
        userId: "user-member",
        memberRole: "member",
      });

      const res = await deleteDebitNoteAction("dn-draft-x");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Only organization owners or admins can delete debit notes");
      expect(mockDebitNoteDelete).not.toHaveBeenCalled();
    });
  });
});
