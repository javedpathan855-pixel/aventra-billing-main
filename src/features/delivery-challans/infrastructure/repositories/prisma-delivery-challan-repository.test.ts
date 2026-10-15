import { beforeEach, describe, expect, it, vi } from "vitest";
import { deliveryChallanRepository } from "./prisma-delivery-challan-repository";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  invoiceFindFirst: vi.fn(),
  salesOrderFindFirst: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        invoice: { findFirst: mocks.invoiceFindFirst },
        salesOrder: { findFirst: mocks.salesOrderFindFirst },
        deliveryChallanItem: { aggregate: mocks.aggregate },
        deliveryChallan: { create: mocks.create },
      }),
  }),
}));

vi.mock("@/features/sales-settings", () => ({
  salesSettingsRepository: {
    allocateNextDeliveryChallanNumber: vi
      .fn()
      .mockResolvedValue({ allocatedNumber: "DC-0001" }),
  },
}));

const baseInput = {
  customerName: "Acme Corp",
  challanDate: new Date("2026-10-14"),
  items: [
    {
      item: "Widgets",
      unit: "PCS",
      orderedQuantity: 5,
      deliveredQuantity: 1,
    },
  ],
};

describe("delivery-challan repository reference ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invoice from another organization", async () => {
    mocks.invoiceFindFirst.mockResolvedValue(null);

    await expect(
      deliveryChallanRepository.create("org-test-123", {
        ...baseInput,
        invoiceId: "inv-foreign",
      }),
    ).rejects.toThrow("Referenced invoice was not found");

    expect(mocks.invoiceFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-foreign", organizationId: "org-test-123" },
      }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a sales order from another organization", async () => {
    mocks.salesOrderFindFirst.mockResolvedValue(null);

    await expect(
      deliveryChallanRepository.create("org-test-123", {
        ...baseInput,
        salesOrderId: "so-foreign",
      }),
    ).rejects.toThrow("Referenced Sales Order was not found");

    expect(mocks.create).not.toHaveBeenCalled();
  });
});
