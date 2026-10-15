import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => mockPrisma,
}));

import { purchaseBillRepository } from "./prisma-purchase-bill-repository";
import { DuplicateSupplierInvoiceError } from "../../domain/errors/purchase-bill-errors";

const mockCreate = vi.fn();
const mockPrisma = {
  purchaseBill: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
};

const baseInput = {
  billNumber: "PB-0001",
  supplierId: "sup-1",
  supplierName: "Shree Balaji Traders",
  supplierInvoiceNumber: "INV-2026-118",
  billDate: new Date("2026-10-14"),
  dueDate: new Date("2026-11-13"),
  status: "Draft" as const,
  taxMode: "CGST_SGST" as const,
  items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
};

describe("prisma purchase bill repository duplicate handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps a supplier-invoice unique violation to DuplicateSupplierInvoiceError", async () => {
    mockCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["organizationId", "supplierId", "supplierInvoiceNumber"] },
    });

    await expect(
      purchaseBillRepository.create("org-1", baseInput),
    ).rejects.toBeInstanceOf(DuplicateSupplierInvoiceError);
  });

  it("maps other unique violations to a safe duplicate-number error", async () => {
    mockCreate.mockRejectedValue({
      code: "P2002",
      meta: { target: ["organizationId", "billNumber"] },
    });

    const err = await purchaseBillRepository
      .create("org-1", baseInput)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(DuplicateSupplierInvoiceError);
    expect((err as Error).message).toContain("already exists");
    expect((err as Error).message).not.toContain("P2002");
  });

  it("rethrows non-constraint failures untouched", async () => {
    mockCreate.mockRejectedValue(new Error("connection reset"));

    await expect(
      purchaseBillRepository.create("org-1", baseInput),
    ).rejects.toThrow("connection reset");
  });
});
