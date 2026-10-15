import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createInvoiceAction,
  deleteInvoiceAction,
} from "./invoice-mutations";
import { resolveInvoiceContext } from "../context/invoice-context";

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

const mockInvoiceCreate = vi.fn();
const mockInvoiceFindById = vi.fn();
vi.mock("../../infrastructure/repositories/prisma-invoice-repository", () => ({
  invoiceRepository: {
    create: (...args: unknown[]) => mockInvoiceCreate(...args),
    findById: (...args: unknown[]) => mockInvoiceFindById(...args),
    delete: vi.fn(),
  },
}));

vi.mock("@/features/customers/infrastructure/repositories/prisma-customer-repository", () => ({
  customerRepository: {
    findById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("@/features/billing-settings", () => ({
  billingSettingsRepository: {
    allocateNextNumber: vi.fn(),
  },
}));

vi.mock("../queries/get-supplier-tax-context", () => ({
  getSupplierTaxContext: vi.fn().mockResolvedValue({
    state: "27-Maharashtra",
    gstNumber: "27ABCDE1234F1Z5",
    organizationName: "Aventra Tech Solutions",
  }),
}));

const draftInput: {
  customerName: string;
  issueDate: string;
  dueDate: string;
  items: Array<{ item: string; quantity: number; unitPrice: number }>;
} = {
  customerName: "Acme",
  issueDate: "2026-10-15",
  dueDate: "2026-10-30",
  items: [{ item: "Service", quantity: 1, unitPrice: 1000 }],
};

/**
 * DEF-006 regression tests: financial mutations enforce owner/admin
 * server-side. Hiding a button is not authorization.
 */
describe("invoice authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies issuing an invoice to a plain member", async () => {
    vi.mocked(resolveInvoiceContext).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-member",
      memberRole: "member",
    });

    const res = await createInvoiceAction({ ...draftInput, status: "Issued" });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Only organization owners or admins can issue invoices");
    expect(mockInvoiceCreate).not.toHaveBeenCalled();
  });

  it("allows a member to save a draft", async () => {
    vi.mocked(resolveInvoiceContext).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-member",
      memberRole: "member",
    });
    mockInvoiceCreate.mockImplementation(async (payload: unknown) => ({
      ...(payload as Record<string, unknown>),
      id: "inv-draft-1",
    }));

    const { billingSettingsRepository } = await import("@/features/billing-settings");
    vi.mocked(billingSettingsRepository.allocateNextNumber).mockResolvedValue({
      allocatedNumber: "INV-0001",
      nextNumber: 2,
    });

    const res = await createInvoiceAction({ ...draftInput, status: "Draft" });

    expect(res.success).toBe(true);
  });

  it("denies deleting an invoice to a plain member", async () => {
    vi.mocked(resolveInvoiceContext).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-member",
      memberRole: "member",
    });
    mockInvoiceFindById.mockResolvedValue({ id: "inv-1", status: "Draft" });

    const res = await deleteInvoiceAction("inv-1");

    expect(res.success).toBe(false);
    expect(res.error).toContain("Only organization owners or admins can delete invoices");
  });
});
