import type { ProductStatus, ProductType } from "@/features/products/domain/entities/product";

export type PricingEntryDto = {
  productId: string;
  name: string;
  type: ProductType;
  status: ProductStatus;
  category?: string | null;
  unit: string;
  sellingPrice: number;
  purchasePrice?: number | null;
  currency: string;
  taxRate: number;
  updatedAt: string;
};

export type PricingFilterInput = {
  type?: ProductType | "ALL";
  status?: ProductStatus | "ALL";
  category?: string | "ALL";
  query?: string;
  limit?: number;
  offset?: number;
};

export type UpdatePricesInput = {
  sellingPrice: number;
  purchasePrice?: number | null;
};

export type PricingActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
