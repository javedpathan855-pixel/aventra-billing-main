import { z } from "zod";

export const estimateLineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  item: z.string().trim().min(1, "Item or service name is required."),
  description: z.string().optional().default(""),
  hsnSac: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  quantity: z.coerce
    .number()
    .finite("Quantity must be a valid number.")
    .positive("Quantity must be greater than zero."),
  unitPrice: z.coerce
    .number()
    .finite("Price must be a valid number.")
    .min(0, "Price cannot be negative."),
  discount: z.coerce
    .number()
    .finite("Discount must be a valid number.")
    .min(0)
    .max(100, "Discount must be between 0 and 100%.")
    .default(0),
  taxRate: z.coerce
    .number()
    .finite("Tax rate must be a valid number.")
    .min(0)
    .max(100, "Tax rate must be between 0 and 100%.")
    .default(18),
});

const isRealCalendarDate = (value: string): boolean => {
  const parts = value.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const createEstimateSchema = z
  .object({
    customerId: z.string().trim().optional(),
    customerName: z.string().trim().min(1, "Select or enter a customer."),
    customerEmail: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .or(z.literal(""))
      .optional(),
    customerAddress: z.string().trim().optional(),
    customerGstin: z.string().trim().optional(),
    customerPlaceOfSupply: z.string().trim().optional(),
    referenceNumber: z.string().trim().optional(),
    issueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Quotation date must be in YYYY-MM-DD format.")
      .refine(isRealCalendarDate, "Quotation date is not a valid calendar date."),
    validUntil: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Valid until date must be in YYYY-MM-DD format.")
      .refine(isRealCalendarDate, "Valid until date is not a valid calendar date."),
    // Creation is restricted to coherent initial states: the UI creates
    // quotations as Draft ("Save as Draft") or Sent ("Save & Send").
    // Lifecycle states such as Accepted/Converted/Cancelled must be reached
    // through their server-validated transitions, never forged at creation.
    status: z
      .enum([
        "Draft",
        "Sent",
      ])
      .default("Draft"),
    taxMode: z.enum(["CGST_SGST", "IGST"]).default("CGST_SGST"),
    notes: z.string().optional(),
    terms: z.string().optional(),
    items: z.array(estimateLineItemSchema).min(1, "Add at least one line item."),
    additionalCharges: z.coerce
      .number()
      .finite("Charges must be a valid number.")
      .min(0)
      .default(0),
    additionalChargesLabel: z.string().trim().optional(),
    additionalDiscount: z.coerce
      .number()
      .finite("Discount must be a valid number.")
      .min(0)
      .default(0),
    additionalDiscountType: z.enum(["percentage", "fixed"]).default("fixed"),
    additionalDiscountLabel: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.issueDate && data.validUntil) {
        return data.validUntil >= data.issueDate;
      }
      return true;
    },
    {
      message: "Expiration date must be on or after quotation date.",
      path: ["validUntil"],
    },
  );

export const updateEstimateSchema = createEstimateSchema.and(
  z.object({
    id: z.string().min(1, "Estimate ID is required."),
  }),
);
