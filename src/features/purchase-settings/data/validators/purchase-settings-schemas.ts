import { z } from "zod";
import {
  validatePurchaseOrderPrefix,
  validatePurchaseOrderSuffix,
  validatePurchaseOrderNextNumber,
  validatePurchaseOrderPadding,
  validateDefaultDeliveryDays,
  validateDefaultPaymentTerms,
  validatePurchaseDefaultNotes,
  validatePurchaseDefaultTerms,
  validatePurchaseBillPrefix,
  validatePurchaseBillSuffix,
  validatePurchaseBillNextNumber,
  validatePurchaseBillPadding,
  validateDefaultDueDays,
  validatePurchaseBillDefaultNotes,
  validatePurchaseBillDefaultTerms,
  validatePurchaseReturnPrefix,
  validatePurchaseReturnSuffix,
  validatePurchaseReturnNextNumber,
  validatePurchaseReturnPadding,
  validateDefaultPurchaseReturnReason,
  validatePurchaseReturnDefaultNotes,
  validatePurchaseReturnDefaultTerms,
} from "../../domain/rules/purchase-settings-rules";

export const updatePurchaseSettingsSchema = z.object({
  purchaseOrderPrefix: z
    .string()
    .trim()
    .min(1, "Purchase Order prefix is required.")
    .max(20, "Purchase Order prefix cannot exceed 20 characters.")
    .refine(
      (val) => {
        try {
          validatePurchaseOrderPrefix(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          "Prefix may only contain alphanumeric characters, hyphens, underscores, or slashes.",
      },
    )
    .optional(),
  purchaseOrderSuffix: z
    .string()
    .trim()
    .max(20, "Suffix cannot exceed 20 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseOrderSuffix(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          "Suffix may only contain alphanumeric characters, hyphens, underscores, or slashes.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  purchaseOrderNextNumber: z.coerce
    .number()
    .int("Sequence number must be a whole integer.")
    .refine(
      (val) => {
        try {
          validatePurchaseOrderNextNumber(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Sequence number must be between 1 and 999,999,999.",
      },
    )
    .optional(),
  purchaseOrderPadding: z.coerce
    .number()
    .int("Padding digits must be a whole integer.")
    .refine(
      (val) => {
        try {
          validatePurchaseOrderPadding(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Padding must be between 1 and 10 digits.",
      },
    )
    .optional(),
  defaultDeliveryDays: z.coerce
    .number()
    .int("Delivery window must be a whole number of days.")
    .refine(
      (val) => {
        try {
          validateDefaultDeliveryDays(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default delivery window must be between 1 and 365 days.",
      },
    )
    .optional(),
  defaultPaymentTerms: z
    .string()
    .trim()
    .max(100, "Default payment terms cannot exceed 100 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateDefaultPaymentTerms(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default payment terms cannot exceed 100 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  defaultPurchaseOrderNotes: z
    .string()
    .trim()
    .max(2000, "Default purchase order notes cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseDefaultNotes(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default notes cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  defaultPurchaseOrderTerms: z
    .string()
    .trim()
    .max(2000, "Default purchase order terms cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseDefaultTerms(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default terms cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  purchaseBillPrefix: z
    .string()
    .trim()
    .min(1, "Purchase Bill prefix is required.")
    .max(20, "Purchase Bill prefix cannot exceed 20 characters.")
    .refine(
      (val) => {
        try {
          validatePurchaseBillPrefix(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          "Prefix may only contain alphanumeric characters, hyphens, underscores, or slashes.",
      },
    )
    .optional(),
  purchaseBillSuffix: z
    .string()
    .trim()
    .max(20, "Suffix cannot exceed 20 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseBillSuffix(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          "Suffix may only contain alphanumeric characters, hyphens, underscores, or slashes.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  purchaseBillNextNumber: z.coerce
    .number()
    .int("Sequence number must be a whole integer.")
    .refine(
      (val) => {
        try {
          validatePurchaseBillNextNumber(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Sequence number must be between 1 and 999,999,999.",
      },
    )
    .optional(),
  purchaseBillPadding: z.coerce
    .number()
    .int("Padding digits must be a whole integer.")
    .refine(
      (val) => {
        try {
          validatePurchaseBillPadding(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Padding must be between 1 and 10 digits.",
      },
    )
    .optional(),
  defaultDueDays: z.coerce
    .number()
    .int("Due window must be a whole number of days.")
    .refine(
      (val) => {
        try {
          validateDefaultDueDays(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default due window must be between 1 and 365 days.",
      },
    )
    .optional(),
  defaultPurchaseBillNotes: z
    .string()
    .trim()
    .max(2000, "Default purchase bill notes cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseBillDefaultNotes(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default notes cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  defaultPurchaseBillTerms: z
    .string()
    .trim()
    .max(2000, "Default purchase bill terms cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseBillDefaultTerms(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default terms cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  purchaseReturnPrefix: z
    .string()
    .trim()
    .min(1, "Purchase Return prefix is required.")
    .max(20, "Purchase Return prefix cannot exceed 20 characters.")
    .refine(
      (val) => {
        try {
          validatePurchaseReturnPrefix(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          "Prefix may only contain alphanumeric characters, hyphens, underscores, or slashes.",
      },
    )
    .optional(),
  purchaseReturnSuffix: z
    .string()
    .trim()
    .max(20, "Suffix cannot exceed 20 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseReturnSuffix(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message:
          "Suffix may only contain alphanumeric characters, hyphens, underscores, or slashes.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  purchaseReturnNextNumber: z.coerce
    .number()
    .int("Sequence number must be a whole integer.")
    .refine(
      (val) => {
        try {
          validatePurchaseReturnNextNumber(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Sequence number must be between 1 and 999,999,999.",
      },
    )
    .optional(),
  purchaseReturnPadding: z.coerce
    .number()
    .int("Padding digits must be a whole integer.")
    .refine(
      (val) => {
        try {
          validatePurchaseReturnPadding(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Padding must be between 1 and 10 digits.",
      },
    )
    .optional(),
  defaultPurchaseReturnReason: z
    .string()
    .trim()
    .max(255, "Default return reason cannot exceed 255 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateDefaultPurchaseReturnReason(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default return reason cannot exceed 255 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  defaultPurchaseReturnNotes: z
    .string()
    .trim()
    .max(2000, "Default purchase return notes cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseReturnDefaultNotes(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default notes cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  defaultPurchaseReturnTerms: z
    .string()
    .trim()
    .max(2000, "Default purchase return terms cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validatePurchaseReturnDefaultTerms(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default terms cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});
