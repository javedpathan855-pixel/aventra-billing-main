import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { resolvePricingContextMock, productRepositoryMock } = vi.hoisted(() => ({
  resolvePricingContextMock: vi.fn(),
  productRepositoryMock: {
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../context/pricing-context", () => ({
  resolvePricingContext: resolvePricingContextMock,
}));

vi.mock("@/features/products/infrastructure/repositories/prisma-product-repository", () => ({
  productRepository: productRepositoryMock,
}));

import { updateProductPricesAction } from "./update-prices";
import { getPricingOverview } from "../queries/get-pricing";

const product = {
  id: "prod_1",
  organizationId: "org_1",
  name: "Scanner",
  type: "PRODUCT",
  status: "ACTIVE",
  sku: null,
  category: "Hardware",
  description: null,
  sellingPrice: 100,
  purchasePrice: 60,
  currency: "INR (₹)",
  unit: "PCS",
  hsnSac: "84713010",
  taxRate: 18,
  taxPreference: "Taxable",
  trackInventory: false,
  reorderPoint: null,
  internalNotes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("pricing data layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolvePricingContextMock.mockResolvedValue({
      organizationId: "org_1",
      userId: "user_1",
      memberRole: "owner",
    });
  });

  it("reads the canonical product price source without a second store", async () => {
    productRepositoryMock.list.mockResolvedValue({ products: [product], totalCount: 1 });

    const result = await getPricingOverview({});

    expect(result.totalCount).toBe(1);
    expect(result.entries[0]).toMatchObject({
      productId: "prod_1",
      sellingPrice: 100,
      purchasePrice: 60,
    });
    expect(productRepositoryMock.list).toHaveBeenCalledWith(
      "org_1",
      expect.objectContaining({ limit: 100, offset: 0 }),
    );
  });

  it("updates master prices and rejects negative values", async () => {
    productRepositoryMock.findById.mockResolvedValue(product);
    productRepositoryMock.update.mockImplementation(
      async (_org: string, _id: string, patch: Record<string, number | null>) =>
        ({ ...product, ...patch }),
    );

    const ok = await updateProductPricesAction("prod_1", { sellingPrice: 120, purchasePrice: 70 });
    expect(ok.success).toBe(true);
    expect(productRepositoryMock.update).toHaveBeenCalledWith(
      "org_1",
      "prod_1",
      expect.objectContaining({ sellingPrice: 120, purchasePrice: 70 }),
    );

    const bad = await updateProductPricesAction("prod_1", { sellingPrice: -5 });
    expect(bad.success).toBe(false);
    expect(bad.fieldErrors?.sellingPrice).toBeDefined();
  });

  it("rejects prices for products outside the organization", async () => {
    productRepositoryMock.findById.mockResolvedValue(null);

    const result = await updateProductPricesAction("foreign", { sellingPrice: 10 });

    expect(result.success).toBe(false);
    expect(productRepositoryMock.update).not.toHaveBeenCalled();
  });
});
