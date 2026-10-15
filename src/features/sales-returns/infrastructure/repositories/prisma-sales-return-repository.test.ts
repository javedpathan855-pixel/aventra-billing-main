import { beforeEach, describe, expect, it, vi } from "vitest";
import { salesReturnRepository } from "./prisma-sales-return-repository";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  invoiceFindFirst: vi.fn(),
  salesOrderFindFirst: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
  returnFindFirst: vi.fn(),
  itemUpdate: vi.fn(),
  returnUpdate: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        invoice: { findFirst: mocks.invoiceFindFirst },
        salesOrder: { findFirst: mocks.salesOrderFindFirst },
        salesReturnItem: {
          aggregate: mocks.aggregate,
          update: mocks.itemUpdate,
        },
        salesReturn: {
          create: mocks.create,
          findFirst: mocks.returnFindFirst,
          update: mocks.returnUpdate,
        },
      }),
  }),
}));

vi.mock("@/features/sales-settings", () => ({
  salesSettingsRepository: {
    allocateNextSalesReturnNumber: vi
      .fn()
      .mockResolvedValue({ allocatedNumber: "SR-0001" }),
  },
}));

vi.mock("@/features/billing-settings", () => ({
  billingSettingsRepository: {
    allocateNextNumber: vi.fn(),
  },
}));

const baseInput = {
  customerName: "Acme Corp",
  returnDate: new Date("2026-10-14"),
  reason: "Damaged in transit",
  items: [
    {
      item: "Widgets",
      soldQuantity: 5,
      returnQuantity: 1,
      unitPrice: 100,
    },
  ],
};

describe("sales-return repository reference ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a sales order from another organization", async () => {
    mocks.salesOrderFindFirst.mockResolvedValue(null);

    await expect(
      salesReturnRepository.create("org-test-123", {
        ...baseInput,
        salesOrderId: "so-foreign",
      }),
    ).rejects.toThrow("Referenced sales order was not found");

    expect(mocks.salesOrderFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "so-foreign", organizationId: "org-test-123" },
      }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an invoice from another organization", async () => {
    mocks.invoiceFindFirst.mockResolvedValue(null);

    await expect(
      salesReturnRepository.create("org-test-123", {
        ...baseInput,
        invoiceId: "inv-foreign",
      }),
    ).rejects.toThrow("Referenced invoice was not found");

    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("sales-return repository receipt bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects physical receipt exceeding the returned quantity", async () => {
    mocks.returnFindFirst.mockResolvedValue({
      id: "sr-1",
      organizationId: "org-test-123",
      status: "DRAFT",
      creditNoteId: null,
      items: [{ id: "sri-1", item: "Widgets", returnQuantity: 5 }],
    });

    await expect(
      salesReturnRepository.updateStatus("sr-1", "org-test-123", {
        status: "APPROVED",
        receivedQuantities: { "sri-1": 7 },
      }),
    ).rejects.toThrow("cannot exceed the returned quantity");

    expect(mocks.itemUpdate).not.toHaveBeenCalled();
    expect(mocks.returnUpdate).not.toHaveBeenCalled();
  });
});
