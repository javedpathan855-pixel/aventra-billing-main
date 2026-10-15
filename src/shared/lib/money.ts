/**
 * Shared decimal-safe money primitives (DEF-011).
 * Feature-agnostic INR rounding/formatting used by invoice and credit-note
 * domain calculations. Feature modules re-export these names from their own
 * domain barrels so existing imports keep working; the implementation lives
 * here exactly once.
 */
export const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
