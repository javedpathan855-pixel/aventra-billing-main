import { z } from "zod";
import {
  validateEstimatePrefix,
  validateEstimateSuffix,
  validateEstimateNextNumber,
  validateEstimatePadding,
  validateSalesOrderPrefix,
  validateSalesOrderSuffix,
  validateSalesOrderNextNumber,
  validateSalesOrderPadding,
  validateDeliveryChallanPrefix,
  validateDeliveryChallanSuffix,
  validateDeliveryChallanNextNumber,
  validateDeliveryChallanPadding,
  validateSalesReturnPrefix,
  validateSalesReturnSuffix,
  validateSalesReturnNextNumber,
  validateSalesReturnPadding,
  validateDefaultValidityDays,
  validateDefaultDeliveryDays,
  validateSalesDefaultNotes,
  validateSalesDefaultTerms,
  validateDefaultDeliveryInstructions,
  validateDefaultDeliveryTerms,
  validateDefaultReturnReason,
  validateDefaultReturnPolicy,
} from "../../domain/rules/sales-settings-rules";

export const updateSalesSettingsSchema = z.object({
  estimatePrefix: z
    .string()
    .trim()
    .min(1, "Estimate prefix is required.")
    .max(20, "Estimate prefix cannot exceed 20 characters.")
    .refine(
      (val) => {
        try {
          validateEstimatePrefix(val);
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
  estimateSuffix: z
    .string()
    .trim()
    .max(20, "Suffix cannot exceed 20 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateEstimateSuffix(val);
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
  estimateNextNumber: z.coerce
    .number()
    .int("Sequence number must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateEstimateNextNumber(val);
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
  estimatePadding: z.coerce
    .number()
    .int("Padding digits must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateEstimatePadding(val);
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
  salesOrderPrefix: z
    .string()
    .trim()
    .min(1, "Sales Order prefix is required.")
    .max(20, "Sales Order prefix cannot exceed 20 characters.")
    .refine(
      (val) => {
        try {
          validateSalesOrderPrefix(val);
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
  salesOrderSuffix: z
    .string()
    .trim()
    .max(20, "Suffix cannot exceed 20 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateSalesOrderSuffix(val);
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
  salesOrderNextNumber: z.coerce
    .number()
    .int("Sequence number must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateSalesOrderNextNumber(val);
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
  salesOrderPadding: z.coerce
    .number()
    .int("Padding digits must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateSalesOrderPadding(val);
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
  defaultValidityDays: z.coerce
    .number()
    .int("Validity period must be a whole number of days.")
    .refine(
      (val) => {
        try {
          validateDefaultValidityDays(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Default validity period must be between 1 and 365 days.",
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
  defaultNotes: z
    .string()
    .trim()
    .max(2000, "Default notes cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateSalesDefaultNotes(val);
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
  defaultTerms: z
    .string()
    .trim()
    .max(2000, "Default terms cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateSalesDefaultTerms(val);
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
  defaultSalesOrderNotes: z
    .string()
    .trim()
    .max(2000, "Default sales order notes cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateSalesDefaultNotes(val);
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
  defaultSalesOrderTerms: z
    .string()
    .trim()
    .max(2000, "Default sales order terms cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateSalesDefaultTerms(val);
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
  deliveryChallanPrefix: z
    .string()
    .trim()
    .min(1, "Delivery Challan prefix is required.")
    .max(20, "Delivery Challan prefix cannot exceed 20 characters.")
    .refine(
      (val) => {
        try {
          validateDeliveryChallanPrefix(val);
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
  deliveryChallanSuffix: z
    .string()
    .trim()
    .max(20, "Suffix cannot exceed 20 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateDeliveryChallanSuffix(val);
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
  deliveryChallanNextNumber: z.coerce
    .number()
    .int("Sequence number must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateDeliveryChallanNextNumber(val);
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
  deliveryChallanPadding: z.coerce
    .number()
    .int("Padding digits must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateDeliveryChallanPadding(val);
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
  salesReturnPrefix: z
    .string()
    .trim()
    .min(1, "Sales Return prefix is required.")
    .max(20, "Sales Return prefix cannot exceed 20 characters.")
    .refine(
      (val) => {
        try {
          validateSalesReturnPrefix(val);
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
  salesReturnSuffix: z
    .string()
    .trim()
    .max(20, "Suffix cannot exceed 20 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateSalesReturnSuffix(val);
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
  salesReturnNextNumber: z.coerce
    .number()
    .int("Sequence number must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateSalesReturnNextNumber(val);
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
  salesReturnPadding: z.coerce
    .number()
    .int("Padding digits must be a whole integer.")
    .refine(
      (val) => {
        try {
          validateSalesReturnPadding(val);
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
  defaultDeliveryInstructions: z
    .string()
    .trim()
    .max(2000, "Delivery instructions cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateDefaultDeliveryInstructions(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Delivery instructions cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  defaultDeliveryTerms: z
    .string()
    .trim()
    .max(2000, "Delivery terms cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateDefaultDeliveryTerms(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Delivery terms cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  defaultReturnReason: z
    .string()
    .trim()
    .max(255, "Default return reason cannot exceed 255 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateDefaultReturnReason(val);
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
  defaultReturnPolicy: z
    .string()
    .trim()
    .max(2000, "Return policy cannot exceed 2000 characters.")
    .optional()
    .nullable()
    .refine(
      (val) => {
        try {
          validateDefaultReturnPolicy(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Return policy cannot exceed 2000 characters.",
      },
    )
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});
