import { z } from "zod";

export const salesReturnItemSchema = z.object({
  productId: z.string().optional().nullable(),
  invoiceItemId: z.string().optional().nullable(),
  item: z.string().trim().min(1, "Item name is required.").max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  hsnSac: z.string().trim().max(50).optional().nullable(),
  soldQuantity: z.coerce.number().min(0),
  returnQuantity: z.coerce.number().gt(0, "Return quantity must be greater than 0."),
  receivedQuantity: z.coerce.number().min(0).optional().default(0),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
  taxRate: z.coerce.number().min(0).max(100).optional().default(18),
  disposition: z.enum(["RESTOCK", "DAMAGED", "QUARANTINE"]).optional().default("RESTOCK"),
  reason: z.string().trim().max(255).optional().nullable(),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const createSalesReturnSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1, "Customer name is required.").max(255),
  customerEmail: z.string().trim().email("Invalid email address.").optional().nullable().or(z.literal("")),
  customerAddress: z.string().trim().max(1000).optional().nullable(),
  customerGstin: z.string().trim().max(50).optional().nullable(),
  customerPlaceOfSupply: z.string().trim().max(100).optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  salesOrderId: z.string().optional().nullable(),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Return date must be in YYYY-MM-DD format."),
  reason: z.string().trim().min(1, "Return reason is required.").max(255),
  taxMode: z.enum(["CGST_SGST", "IGST"]).default("CGST_SGST"),
  currency: z.string().trim().default("INR (₹)"),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(salesReturnItemSchema).min(1, "At least one item must be returned."),
});

export const updateSalesReturnStatusSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "COMPLETED", "CANCELLED"]),
  receivedQuantities: z.record(z.string(), z.coerce.number().min(0)).optional(),
  dispositions: z.record(z.string(), z.enum(["RESTOCK", "DAMAGED", "QUARANTINE"])).optional(),
  createCreditNote: z.boolean().optional().default(false),
});
