import "server-only";

import { resolvePricingContext } from "../context/pricing-context";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { toPricingEntryDto } from "../mappers/pricing-mappers";
import type { PricingEntry } from "../../domain/entities/pricing";
import type { PricingEntryDto, PricingFilterInput } from "../dto/pricing-dto";

export type GetPricingResult = {
  entries: PricingEntryDto[];
  totalCount: number;
};

/**
 * Authoritative pricing overview. Reads the single canonical price source —
 * Product.sellingPrice / Product.purchasePrice — through the products
 * repository contract. There is deliberately no separate pricing store.
 */
export const getPricingOverview = async (
  filter?: PricingFilterInput,
): Promise<GetPricingResult> => {
  const { organizationId } = await resolvePricingContext();

  const result = await productRepository.list(organizationId, {
    type: filter?.type,
    status: filter?.status,
    category: filter?.category,
    query: filter?.query,
    limit: filter?.limit ?? 100,
    offset: filter?.offset ?? 0,
  });

  const entries: PricingEntry[] = result.products.map((p) => ({
    productId: p.id,
    organizationId: p.organizationId,
    name: p.name,
    type: p.type,
    status: p.status,
    category: p.category,
    unit: p.unit,
    sellingPrice: p.sellingPrice,
    purchasePrice: p.purchasePrice,
    currency: p.currency,
    taxRate: p.taxRate,
    updatedAt: p.updatedAt,
  }));

  return {
    entries: entries.map(toPricingEntryDto),
    totalCount: result.totalCount,
  };
};
