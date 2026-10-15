import { z } from "zod";
import {
  isGstinRequired,
  isValidGstinFormat,
  isValidPanFormat,
  derivePanFromGstin,
} from "../../domain/rules/supplier-rules";

const gstTreatmentSchema = z.enum([
  "REGISTERED_BUSINESS_REGULAR",
  "CONSUMER_UNREGISTERED",
  "OVERSEAS_EXPORT",
  "SPECIAL_ECONOMIC_ZONE",
  "DEEMED_EXPORT",
  "COMPOSITION_SCHEME",
]);

const supplierStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(25)
  .optional()
  .nullable()
  .or(z.literal(""));

// Shared field definitions WITHOUT defaults. Creation applies documented
// defaults per field; the update schema stays purely optional so sparse
// patches never materialize defaults over stored values.
const addressFields = {
  addressLine1: z.string().trim().min(1, "Address Line 1 is required.").max(255),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(1, "City is required.").max(100),
  state: z.string().trim().min(1, "State is required.").max(100),
  pinCode: z.string().trim().min(1, "PIN code is required.").max(20),
  country: z.string().trim().min(1, "Country is required.").max(100),
};

const supplierFields = {
  name: z.string().trim().min(2, "Supplier name must be at least 2 characters.").max(150),
  status: supplierStatusSchema,
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: optionalPhoneSchema,
  alternatePhone: optionalPhoneSchema,
  billingAddress: z.object({
    ...addressFields,
    country: addressFields.country.default("India"),
  }),
  shippingAddress: z
    .object(addressFields)
    .optional()
    .nullable(),
  sameAsBillingAddress: z.boolean(),
  gstTreatment: gstTreatmentSchema,
  gstin: z.string().trim().max(20).optional().nullable().or(z.literal("")),
  pan: z.string().trim().max(15).optional().nullable().or(z.literal("")),
  currency: z.string().trim().max(10),
  paymentTerms: z.string().trim().max(50).optional().nullable(),
  internalNotes: z.string().trim().max(2000).optional().nullable(),
};

// GSTIN/PAN cross-field rules for supplier creation. Updates use the plain
// partial schema plus merged-record checks in `updateSupplierAction`, since
// Zod defaults would otherwise reject sparse patches.
const withSupplierTaxRefines = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine(
      (data) => {
        const record = data as { gstTreatment?: Parameters<typeof isGstinRequired>[0]; gstin?: string | null };
        const gstin = record.gstin?.replace(/\s+/g, "").toUpperCase();
        if (record.gstTreatment && isGstinRequired(record.gstTreatment)) {
          return Boolean(gstin && gstin.length > 0);
        }
        return true;
      },
      {
        message: "GSTIN is required for registered businesses.",
        path: ["gstin"],
      },
    )
    .refine(
      (data) => {
        const record = data as { gstin?: string | null };
        const gstin = record.gstin?.replace(/\s+/g, "").toUpperCase();
        if (gstin && gstin.length > 0) {
          return isValidGstinFormat(gstin);
        }
        return true;
      },
      {
        message: "GSTIN must be a valid 15-character format (e.g., 27AABCS1234F1Z9).",
        path: ["gstin"],
      },
    )
    .refine(
      (data) => {
        const record = data as { pan?: string | null };
        const pan = record.pan?.replace(/\s+/g, "").toUpperCase();
        if (pan && pan.length > 0) {
          return isValidPanFormat(pan);
        }
        return true;
      },
      {
        message: "PAN must be a valid 10-character code (e.g., AABCS1234F).",
        path: ["pan"],
      },
    )
    .refine(
      (data) => {
        const record = data as { gstin?: string | null; pan?: string | null };
        const gstin = record.gstin?.replace(/\s+/g, "").toUpperCase();
        const pan = record.pan?.replace(/\s+/g, "").toUpperCase();
        if (gstin && isValidGstinFormat(gstin) && pan && pan.length > 0) {
          const derived = derivePanFromGstin(gstin);
          if (derived && derived !== pan) {
            return false;
          }
        }
        return true;
      },
      {
        message: "PAN must match the PAN embedded in the GSTIN.",
        path: ["pan"],
      },
    );

export const createSupplierSchema = (() => {
  const withDefaults = {
    ...supplierFields,
    status: supplierStatusSchema.default("ACTIVE"),
    sameAsBillingAddress: z.boolean().default(true),
    gstTreatment: gstTreatmentSchema.default("REGISTERED_BUSINESS_REGULAR"),
    currency: z.string().trim().max(10).default("INR (₹)"),
  };
  return withSupplierTaxRefines(z.object(withDefaults));
})();

// Purely optional: no defaults materialize, so sparse patches only carry
// explicitly provided fields through to the repository.
export const updateSupplierSchema = z.object(supplierFields).partial();

export const updateSupplierStatusSchema = z.object({
  status: supplierStatusSchema,
});

export const supplierFilterSchema = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(8),
});
