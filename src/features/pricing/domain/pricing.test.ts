import { describe, expect, it } from "vitest";
import {
  computeMarginPercent,
  isSupportedPriceCurrency,
  resolveLinePrice,
  SUPPORTED_PRICE_CURRENCIES,
  validateMasterPrice,
  PricingDomainError,
} from "./rules/pricing-rules";

describe("pricing domain rules", () => {
  it("declares tax-exclusive master-price semantics and supported currencies", () => {
    expect(SUPPORTED_PRICE_CURRENCIES).toEqual(["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)"]);
    expect(isSupportedPriceCurrency("INR (₹)")).toBe(true);
    expect(isSupportedPriceCurrency("JPY")).toBe(false);
  });

  it("validates master prices as non-negative 2dp values", () => {
    expect(validateMasterPrice(10.125)).toBe(10.13);
    expect(() => validateMasterPrice(-1)).toThrow(PricingDomainError);
    expect(() => validateMasterPrice(Number.NaN)).toThrow(PricingDomainError);
  });

  it("resolves sales and purchase defaults without crossing semantics", () => {
    const product = { sellingPrice: 100, purchasePrice: 60 };
    expect(resolveLinePrice(product, "SALES")).toBe(100);
    expect(resolveLinePrice(product, "PURCHASE")).toBe(60);
    expect(resolveLinePrice({ sellingPrice: 100 }, "PURCHASE")).toBe(100);
    expect(resolveLinePrice({}, "SALES")).toBe(0);
  });

  it("computes gross margin only when meaningful", () => {
    expect(computeMarginPercent(100, 60)).toBe(40);
    expect(computeMarginPercent(100, null)).toBeNull();
    expect(computeMarginPercent(0, 10)).toBeNull();
  });
});
