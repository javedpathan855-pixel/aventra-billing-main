export type PricingSide = "SALES" | "PURCHASE";

/**
 * Master prices are tax-exclusive: transaction line maths applies the tax
 * rate on top of the unit price (see invoice/estimate/order line totals).
 * Changing a master price only affects future selections — finalized
 * documents keep their persisted snapshots.
 */
export const MASTER_PRICE_TAX_SEMANTICS = "TAX_EXCLUSIVE" as const;

export const SUPPORTED_PRICE_CURRENCIES = ["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)"] as const;

export type SupportedPriceCurrency = (typeof SUPPORTED_PRICE_CURRENCIES)[number];

export const isSupportedPriceCurrency = (currency: string): boolean =>
  (SUPPORTED_PRICE_CURRENCIES as readonly string[]).includes(currency);

export const validateMasterPrice = (price: number): number => {
  if (!Number.isFinite(price) || price < 0) {
    throw new PricingDomainError("Price must be a valid non-negative number.");
  }
  return Math.round(price * 100) / 100;
};

export class PricingDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingDomainError";
  }
}

export class UnauthorizedPricingAccessError extends PricingDomainError {
  constructor(message = "You are not authorized to access pricing information.") {
    super(message);
    this.name = "UnauthorizedPricingAccessError";
  }
}

/**
 * Canonical price-default resolution. Sales documents default to the
 * selling price; purchase documents default to the purchase price with a
 * selling-price fallback for service-style catalogue items that carry no
 * supplier cost. Never the reverse.
 */
export const resolveLinePrice = (
  product: { sellingPrice?: number | null; purchasePrice?: number | null },
  side: PricingSide,
): number => {
  if (side === "PURCHASE") {
    return product.purchasePrice ?? product.sellingPrice ?? 0;
  }
  return product.sellingPrice ?? 0;
};

/** Gross margin percent of the selling price; null when not computable. */
export const computeMarginPercent = (
  sellingPrice: number,
  purchasePrice?: number | null,
): number | null => {
  if (purchasePrice === undefined || purchasePrice === null) return null;
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return null;
  return Math.round(((sellingPrice - purchasePrice) / sellingPrice) * 1000) / 10;
};
