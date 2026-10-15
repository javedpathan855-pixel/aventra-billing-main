import { z } from "zod";

export const salesOrderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  item: z
    .string()
    .trim()
    .min(1, "Item name/description is required.")
    .max(255, "Item name cannot exceed 255 characters."),
  description: z.string().trim().max(1000).optional().nullable(),
  hsnSac: z.string().trim().max(20).optional().nullable(),
  quantity: z.coerce
    .number()
    .gt(0, "Quantity must be greater than zero."),
  unitPrice: z.coerce
    .number()
    .min(0, "Unit price cannot be negative."),
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
});

// Shared field definitions without defaults. The create schema applies
// defaults for new documents; the update schema keeps every field purely
// optional so omitted fields never overwrite persisted values.
const orderNumberField = z.string().trim().max(50).optional();
const customerIdField = z.string().trim().optional().nullable();
const customerNameField = z
  .string()
  .trim()
  .min(1, "Customer name is required.")
  .max(255, "Customer name cannot exceed 255 characters.");
const customerEmailField = z
  .string()
  .trim()
  .email("Invalid customer email address.")
  .optional()
  .nullable()
  .or(z.literal(""));
const customerAddressField = z.string().trim().max(1000).optional().nullable();
const customerGstinField = z.string().trim().max(20).optional().nullable();
const customerPlaceOfSupplyField = z
  .string()
  .trim()
  .max(100)
  .optional()
  .nullable();
const orderDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Order date must be in YYYY-MM-DD format.");
const expectedDeliveryDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Delivery date must be in YYYY-MM-DD format.")
  .optional()
  .nullable()
  .or(z.literal(""));
const referenceNumberField = z.string().trim().max(100).optional().nullable();
const taxModeField = z.enum(["CGST_SGST", "IGST"]);
const currencyField = z.string();
const statusField = z.enum([
  "Draft",
  "Confirmed",
  "PartiallyFulfilled",
  "Fulfilled",
  "Cancelled",
]);
// Creation is restricted to coherent initial states: the UI creates orders as
// Draft ("Save as Draft") or Confirmed ("Save & Confirm"). Fulfilled states
// require recorded fulfilment and Cancelled is terminal, so accepting them at
// creation would persist internally inconsistent or dead records.
const initialStatusField = z.enum(["Draft", "Confirmed"]);
const notesField = z.string().trim().max(2000).optional().nullable();
const termsField = z.string().trim().max(2000).optional().nullable();
const additionalChargesField = z.coerce.number().min(0);
const additionalChargesLabelField = z
  .string()
  .trim()
  .max(100)
  .optional()
  .nullable();
const additionalDiscountField = z.coerce.number().min(0);
const additionalDiscountTypeField = z.enum(["fixed", "percentage"]);
const additionalDiscountLabelField = z
  .string()
  .trim()
  .max(100)
  .optional()
  .nullable();
const sourceEstimateIdField = z.string().optional().nullable();

export const createSalesOrderSchema = z.object({
  orderNumber: orderNumberField,
  customerId: customerIdField,
  customerName: customerNameField,
  customerEmail: customerEmailField,
  customerAddress: customerAddressField,
  customerGstin: customerGstinField,
  customerPlaceOfSupply: customerPlaceOfSupplyField,
  orderDate: orderDateField,
  expectedDeliveryDate: expectedDeliveryDateField,
  referenceNumber: referenceNumberField,
  taxMode: taxModeField.default("CGST_SGST"),
  currency: currencyField.default("INR (₹)"),
  status: initialStatusField.default("Draft"),
  notes: notesField,
  terms: termsField,
  additionalCharges: additionalChargesField.optional().default(0),
  additionalChargesLabel: additionalChargesLabelField,
  additionalDiscount: additionalDiscountField.optional().default(0),
  additionalDiscountType: additionalDiscountTypeField.default("fixed"),
  additionalDiscountLabel: additionalDiscountLabelField,
  sourceEstimateId: sourceEstimateIdField,
  items: z
    .array(salesOrderItemSchema)
    .min(1, "Sales order must contain at least one line item."),
});

export const updateSalesOrderSchema = z
  .object({
    orderNumber: orderNumberField,
    customerId: customerIdField,
    customerName: customerNameField.optional(),
    customerEmail: customerEmailField,
    customerAddress: customerAddressField,
    customerGstin: customerGstinField,
    customerPlaceOfSupply: customerPlaceOfSupplyField,
    orderDate: orderDateField.optional(),
    expectedDeliveryDate: expectedDeliveryDateField,
    referenceNumber: referenceNumberField,
    taxMode: taxModeField.optional(),
    currency: currencyField.optional(),
    status: statusField.optional(),
    notes: notesField,
    terms: termsField,
    additionalCharges: additionalChargesField.optional(),
    additionalChargesLabel: additionalChargesLabelField,
    additionalDiscount: additionalDiscountField.optional(),
    additionalDiscountType: additionalDiscountTypeField.optional(),
    additionalDiscountLabel: additionalDiscountLabelField,
    sourceEstimateId: sourceEstimateIdField,
    items: z
      .array(salesOrderItemSchema)
      .min(1, "Sales order must contain at least one line item.")
      .optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided for update.",
  });

export const recordFulfilmentSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, "Line item ID is required."),
        fulfilledQuantity: z.coerce
          .number()
          .min(0, "Fulfilled quantity cannot be negative."),
      }),
    )
    .min(1, "At least one item must be updated."),
});
