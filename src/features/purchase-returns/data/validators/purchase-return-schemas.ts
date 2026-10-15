import { z } from "zod";

const dispositionField = z
  .enum(["RESTOCK", "DAMAGED", "QUARANTINE"])
  .optional()
  .default("RESTOCK");

export const purchaseReturnItemSchema = z.object({
  productId: z.string().optional().nullable(),
  purchaseBillItemId: z.string().optional().nullable(),
  item: z
    .string()
    .trim()
    .min(1, "Item name/description is required.")
    .max(255, "Item name cannot exceed 255 characters."),
  description: z.string().trim().max(1000).optional().nullable(),
  hsnSac: z.string().trim().max(50).optional().nullable(),
  billedQuantity: z.coerce.number().min(0, "Billed quantity cannot be negative."),
  returnQuantity: z.coerce.number().gt(0, "Return quantity must be greater than zero."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  discount: z.coerce
    .number()
    .min(0, "Discount cannot be negative.")
    .max(100, "Discount percentage cannot exceed 100%.")
    .optional()
    .default(0),
  taxRate: z.coerce
    .number()
    .min(0, "Tax rate cannot be negative.")
    .max(100, "Tax rate cannot exceed 100%.")
    .optional()
    .default(18),
  disposition: dispositionField,
  reason: z.string().trim().max(255).optional().nullable(),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const createPurchaseReturnSchema = z.object({
  returnNumber: z.string().trim().max(50).optional(),
  supplierId: z.string().trim().optional().nullable(),
  supplierName: z
    .string()
    .trim()
    .min(1, "Supplier name is required.")
    .max(255, "Supplier name cannot exceed 255 characters."),
  supplierEmail: z
    .string()
    .trim()
    .email("Invalid supplier email address.")
    .optional()
    .nullable()
    .or(z.literal("")),
  supplierAddress: z.string().trim().max(1000).optional().nullable(),
  supplierGstin: z.string().trim().max(50).optional().nullable(),
  supplierPlaceOfSupply: z.string().trim().max(100).optional().nullable(),
  purchaseBillId: z.string().trim().optional().nullable(),
  purchaseOrderId: z.string().trim().optional().nullable(),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Return date must be in YYYY-MM-DD format."),
  reason: z
    .string()
    .trim()
    .min(1, "A reason for the return is required.")
    .max(255, "Reason cannot exceed 255 characters."),
  taxMode: z.enum(["CGST_SGST", "IGST"]).default("CGST_SGST"),
  currency: z.string().default("INR (₹)"),
  notes: z.string().trim().max(2000).optional().nullable(),
  terms: z.string().trim().max(2000).optional().nullable(),
  items: z
    .array(purchaseReturnItemSchema)
    .min(1, "Purchase return must contain at least one line item."),
});

export const updatePurchaseReturnStatusSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "COMPLETED", "CANCELLED"]),
});
