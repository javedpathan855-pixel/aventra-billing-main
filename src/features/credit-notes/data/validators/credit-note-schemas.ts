import { z } from "zod";

export const creditNoteLineItemSchema = z.object({
  id: z.string().optional(),
  invoiceItemId: z.string().optional(),
  productId: z.string().optional(),
  item: z.string().trim().min(1, "Item or service name is required."),
  description: z.string().optional().default(""),
  hsnSac: z.string().trim().optional(),
  quantity: z.coerce.number().finite("Quantity must be a valid number.").positive("Quantity must be greater than zero."),
  unitPrice: z.coerce.number().finite("Unit price must be a valid number.").min(0, "Unit price cannot be negative."),
  discount: z.coerce.number().finite("Discount must be a valid number.").min(0, "Discount must be at least 0%.").max(100, "Discount cannot exceed 100%.").default(0),
  taxRate: z.coerce.number().finite("Tax rate must be a valid number.").min(0, "Tax rate must be at least 0%.").max(100, "Tax rate cannot exceed 100%.").default(18),
});

export const createCreditNoteSchema = z.object({
  invoiceId: z.string().min(1, "Original invoice reference is required."),
  creditNoteNumber: z.string().trim().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format."),
  status: z.enum(["Draft", "Issued", "Cancelled"]).default("Draft"),
  reason: z.string().trim().min(1, "Credit reason is required.").max(500, "Credit reason cannot exceed 500 characters."),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters.").optional(),
  terms: z.string().max(2000, "Terms cannot exceed 2000 characters.").optional(),
  items: z.array(creditNoteLineItemSchema).min(1, "At least one item must be credited."),
});

export const updateCreditNoteSchema = z.object({
  id: z.string().min(1, "Credit note ID is required."),
  creditNoteNumber: z.string().trim().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Issue date must be in YYYY-MM-DD format."),
  status: z.enum(["Draft", "Issued", "Cancelled"]).default("Draft"),
  reason: z.string().trim().min(1, "Credit reason is required.").max(500, "Credit reason cannot exceed 500 characters."),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters.").optional(),
  terms: z.string().max(2000, "Terms cannot exceed 2000 characters.").optional(),
  items: z.array(creditNoteLineItemSchema).min(1, "At least one item must be credited."),
});
