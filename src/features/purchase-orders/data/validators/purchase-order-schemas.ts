import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  item: z
    .string()
    .trim()
    .min(1, "Item name/description is required.")
    .max(255, "Item name cannot exceed 255 characters."),
  description: z.string().trim().max(1000).optional().nullable(),
  hsnSac: z.string().trim().max(20).optional().nullable(),
  unit: z.string().trim().max(50).optional().nullable(),
  quantity: z.coerce.number().gt(0, "Quantity must be greater than zero."),
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
});

// Shared field definitions without defaults. The create schema applies
// defaults for new documents; the update schema keeps every field purely
// optional so omitted fields never overwrite persisted values.
const orderNumberField = z.string().trim().max(50).optional();
const supplierIdField = z.string().trim().optional().nullable();
const supplierNameField = z
  .string()
  .trim()
  .min(1, "Supplier name is required.")
  .max(255, "Supplier name cannot exceed 255 characters.");
const supplierEmailField = z
  .string()
  .trim()
  .email("Invalid supplier email address.")
  .optional()
  .nullable()
  .or(z.literal(""));
const supplierAddressField = z.string().trim().max(1000).optional().nullable();
const supplierGstinField = z.string().trim().max(20).optional().nullable();
const supplierPlaceOfSupplyField = z
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
const paymentTermsField = z.string().trim().max(100).optional().nullable();
const statusField = z.enum([
  "Draft",
  "Confirmed",
  "PartiallyReceived",
  "Received",
  "Cancelled",
]);
// Creation is restricted to coherent initial states: the UI creates orders as
// Draft ("Save as Draft") or Confirmed ("Save & Confirm"). Received states
// require recorded goods receipts and Cancelled is terminal, so accepting
// them at creation would persist internally inconsistent or dead records.
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

export const createPurchaseOrderSchema = z.object({
  orderNumber: orderNumberField,
  supplierId: supplierIdField,
  supplierName: supplierNameField,
  supplierEmail: supplierEmailField,
  supplierAddress: supplierAddressField,
  supplierGstin: supplierGstinField,
  supplierPlaceOfSupply: supplierPlaceOfSupplyField,
  orderDate: orderDateField,
  expectedDeliveryDate: expectedDeliveryDateField,
  referenceNumber: referenceNumberField,
  taxMode: taxModeField.default("CGST_SGST"),
  currency: currencyField.default("INR (₹)"),
  paymentTerms: paymentTermsField,
  status: initialStatusField.default("Draft"),
  notes: notesField,
  terms: termsField,
  additionalCharges: additionalChargesField.optional().default(0),
  additionalChargesLabel: additionalChargesLabelField,
  additionalDiscount: additionalDiscountField.optional().default(0),
  additionalDiscountType: additionalDiscountTypeField.default("fixed"),
  additionalDiscountLabel: additionalDiscountLabelField,
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "Purchase order must contain at least one line item."),
});

export const updatePurchaseOrderSchema = z
  .object({
    orderNumber: orderNumberField,
    supplierId: supplierIdField,
    supplierName: supplierNameField.optional(),
    supplierEmail: supplierEmailField,
    supplierAddress: supplierAddressField,
    supplierGstin: supplierGstinField,
    supplierPlaceOfSupply: supplierPlaceOfSupplyField,
    orderDate: orderDateField.optional(),
    expectedDeliveryDate: expectedDeliveryDateField,
    referenceNumber: referenceNumberField,
    taxMode: taxModeField.optional(),
    currency: currencyField.optional(),
    paymentTerms: paymentTermsField,
    status: statusField.optional(),
    notes: notesField,
    terms: termsField,
    additionalCharges: additionalChargesField.optional(),
    additionalChargesLabel: additionalChargesLabelField,
    additionalDiscount: additionalDiscountField.optional(),
    additionalDiscountType: additionalDiscountTypeField.optional(),
    additionalDiscountLabel: additionalDiscountLabelField,
    items: z
      .array(purchaseOrderItemSchema)
      .min(1, "Purchase order must contain at least one line item.")
      .optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided for update.",
  });

export const recordReceivingSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, "Line item ID is required."),
        receivedQuantity: z.coerce
          .number()
          .min(0, "Received quantity cannot be negative."),
      }),
    )
    .min(1, "At least one item must be updated."),
});
