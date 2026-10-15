import type { ProductStatus, ProductType } from "@/features/products/domain/entities/product";

export type PricingEntry = {
  productId: string;
  organizationId: string;
  name: string;
  type: ProductType;
  status: ProductStatus;
  category?: string | null;
  unit: string;
  sellingPrice: number;
  purchasePrice?: number | null;
  currency: string;
  taxRate: number;
  updatedAt: Date;
};

export type PricingListFilter = {
  type?: ProductType | "ALL";
  status?: ProductStatus | "ALL";
  category?: string | "ALL";
  query?: string;
  limit?: number;
  offset?: number;
};
