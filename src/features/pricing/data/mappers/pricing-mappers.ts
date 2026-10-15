import type { PricingEntry } from "../../domain/entities/pricing";
import type { PricingEntryDto } from "../dto/pricing-dto";

export const toPricingEntryDto = (e: PricingEntry): PricingEntryDto => ({
  productId: e.productId,
  name: e.name,
  type: e.type,
  status: e.status,
  category: e.category ?? null,
  unit: e.unit,
  sellingPrice: e.sellingPrice,
  purchasePrice: e.purchasePrice ?? null,
  currency: e.currency,
  taxRate: e.taxRate,
  updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : String(e.updatedAt),
});
