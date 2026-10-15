import { z } from "zod";

export const updatePricesSchema = z.object({
  sellingPrice: z
    .coerce
    .number()
    .finite("Selling price must be a valid number.")
    .min(0, "Selling price cannot be negative."),
  purchasePrice: z
    .coerce
    .number()
    .finite("Purchase price must be a valid number.")
    .min(0, "Purchase price cannot be negative.")
    .optional()
    .nullable(),
});

export const pricingFilterSchema = z.object({
  type: z.enum(["PRODUCT", "SERVICE", "ALL"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).optional(),
  category: z.string().optional(),
  query: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});
