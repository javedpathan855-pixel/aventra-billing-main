import type {
  PurchaseOrderNumberComponents,
  PurchaseBillNumberComponents,
  PurchaseReturnNumberComponents,
} from "../entities/purchase-settings";
import {
  InvalidPurchaseNumberFormatError,
  PurchaseSettingsDomainError,
} from "../errors/purchase-settings-errors";

export const DEFAULT_PURCHASE_SETTINGS = {
  purchaseOrderPrefix: "PO-",
  purchaseOrderSuffix: null as string | null,
  purchaseOrderNextNumber: 1,
  purchaseOrderPadding: 4,
  defaultDeliveryDays: 15,
  defaultPaymentTerms: "Net 30 days",
  defaultPurchaseOrderNotes:
    "Please confirm receipt of this purchase order and advise the expected dispatch date.",
  defaultPurchaseOrderTerms:
    "Goods must match the ordered specifications. Payment is released after inspection and acceptance at our premises.",
  purchaseBillPrefix: "PB-",
  purchaseBillSuffix: null as string | null,
  purchaseBillNextNumber: 1,
  purchaseBillPadding: 4,
  defaultDueDays: 30,
  defaultPurchaseBillNotes:
    "Please share the original signed invoice along with e-way bill and delivery challan copies.",
  defaultPurchaseBillTerms:
    "Payment is released after three-way matching of the supplier invoice, purchase order, and goods receipt.",
  purchaseReturnPrefix: "PR-",
  purchaseReturnSuffix: null as string | null,
  purchaseReturnNextNumber: 1,
  purchaseReturnPadding: 4,
  defaultPurchaseReturnReason: "Defective or damaged in transit",
  defaultPurchaseReturnNotes:
    "Please arrange return pickup and share the credit confirmation.",
  defaultPurchaseReturnTerms:
    "Returned goods must match the billed specifications with original packing and invoice references.",
} as const;

/**
 * Pure domain formatter that renders a human-readable purchase order number.
 * Example: { prefix: "PO-", nextNumber: 1, padding: 4 } => "PO-0001"
 */
export const formatPurchaseOrderNumber = (
  components: PurchaseOrderNumberComponents,
): string => {
  const prefix = (components.prefix || "").trim();
  const nextNum = Math.floor(components.nextNumber);
  const padding = Math.max(1, Math.min(10, components.padding || 4));
  const suffix = (components.suffix || "").trim();

  if (isNaN(nextNum) || nextNum < 1) {
    throw new InvalidPurchaseNumberFormatError(
      "Sequence number must be a positive integer greater than or equal to 1.",
    );
  }

  const paddedNumber = String(nextNum).padStart(padding, "0");
  return `${prefix}${paddedNumber}${suffix ? suffix : ""}`;
};

/**
 * Pure domain formatter that renders a human-readable purchase bill number.
 * Example: { prefix: "PB-", nextNumber: 1, padding: 4 } => "PB-0001"
 */
export const formatPurchaseBillNumber = (
  components: PurchaseBillNumberComponents,
): string => {
  const prefix = (components.prefix || "").trim();
  const nextNum = Math.floor(components.nextNumber);
  const padding = Math.max(1, Math.min(10, components.padding || 4));
  const suffix = (components.suffix || "").trim();

  if (isNaN(nextNum) || nextNum < 1) {
    throw new InvalidPurchaseNumberFormatError(
      "Sequence number must be a positive integer greater than or equal to 1.",
    );
  }

  const paddedNumber = String(nextNum).padStart(padding, "0");
  return `${prefix}${paddedNumber}${suffix ? suffix : ""}`;
};

/**
 * Validates purchase bill number prefix.
 */
export const validatePurchaseOrderPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Order prefix cannot be empty.",
    );
  }
  if (trimmed.length > 20) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Order prefix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Order prefix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates purchase bill number prefix.
 */
export const validatePurchaseBillPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Bill prefix cannot be empty.",
    );
  }
  if (trimmed.length > 20) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Bill prefix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Bill prefix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates purchase bill number suffix.
 */
export const validatePurchaseBillSuffix = (
  suffix?: string | null,
): string | null => {
  if (!suffix) return null;
  const trimmed = suffix.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 20) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Bill suffix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Bill suffix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates purchase bill next sequence number.
 */
export const validatePurchaseBillNextNumber = (num: number): number => {
  if (!Number.isSafeInteger(num) || num < 1 || num > 999_999_999) {
    throw new InvalidPurchaseNumberFormatError(
      "Sequence number must be a valid integer between 1 and 999,999,999.",
    );
  }
  return num;
};

/**
 * Validates purchase bill padding digits.
 */
export const validatePurchaseBillPadding = (padding: number): number => {
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw new InvalidPurchaseNumberFormatError(
      "Padding must be an integer between 1 and 10.",
    );
  }
  return padding;
};

/**
 * Pure domain formatter that renders a human-readable purchase return number.
 * Example: { prefix: "PR-", nextNumber: 1, padding: 4 } => "PR-0001"
 */
export const formatPurchaseReturnNumber = (
  components: PurchaseReturnNumberComponents,
): string => {
  const prefix = (components.prefix || "").trim();
  const nextNum = Math.floor(components.nextNumber);
  const padding = Math.max(1, Math.min(10, components.padding || 4));
  const suffix = (components.suffix || "").trim();

  if (isNaN(nextNum) || nextNum < 1) {
    throw new InvalidPurchaseNumberFormatError(
      "Sequence number must be a positive integer greater than or equal to 1.",
    );
  }

  const paddedNumber = String(nextNum).padStart(padding, "0");
  return `${prefix}${paddedNumber}${suffix ? suffix : ""}`;
};

/**
 * Validates purchase return number prefix.
 */
export const validatePurchaseReturnPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Return prefix cannot be empty.",
    );
  }
  if (trimmed.length > 20) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Return prefix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Return prefix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates purchase return number suffix.
 */
export const validatePurchaseReturnSuffix = (
  suffix?: string | null,
): string | null => {
  if (!suffix) return null;
  const trimmed = suffix.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 20) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Return suffix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Return suffix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates purchase return next sequence number.
 */
export const validatePurchaseReturnNextNumber = (num: number): number => {
  if (!Number.isSafeInteger(num) || num < 1 || num > 999_999_999) {
    throw new InvalidPurchaseNumberFormatError(
      "Sequence number must be a valid integer between 1 and 999,999,999.",
    );
  }
  return num;
};

/**
 * Validates purchase return padding digits.
 */
export const validatePurchaseReturnPadding = (padding: number): number => {
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw new InvalidPurchaseNumberFormatError(
      "Padding must be an integer between 1 and 10.",
    );
  }
  return padding;
};

/**
 * Validates default purchase return reason length.
 */
export const validateDefaultPurchaseReturnReason = (
  reason?: string | null,
): string | null => {
  if (!reason) return null;
  const trimmed = reason.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 255) {
    throw new PurchaseSettingsDomainError(
      "Default return reason cannot exceed 255 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default purchase return notes length.
 */
export const validatePurchaseReturnDefaultNotes = (
  notes?: string | null,
): string | null => {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new PurchaseSettingsDomainError(
      "Default notes cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default purchase return terms length.
 */
export const validatePurchaseReturnDefaultTerms = (
  terms?: string | null,
): string | null => {
  if (!terms) return null;
  const trimmed = terms.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new PurchaseSettingsDomainError(
      "Default terms & conditions cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default bill due window (between 1 and 365 days).
 */
export const validateDefaultDueDays = (days: number): number => {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new PurchaseSettingsDomainError(
      "Default due period must be between 1 and 365 days.",
    );
  }
  return days;
};

/**
 * Validates default purchase bill notes length.
 */
export const validatePurchaseBillDefaultNotes = (
  notes?: string | null,
): string | null => {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new PurchaseSettingsDomainError(
      "Default notes cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default purchase bill terms length.
 */
export const validatePurchaseBillDefaultTerms = (
  terms?: string | null,
): string | null => {
  if (!terms) return null;
  const trimmed = terms.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new PurchaseSettingsDomainError(
      "Default terms & conditions cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates purchase order number suffix.
 */
export const validatePurchaseOrderSuffix = (
  suffix?: string | null,
): string | null => {
  if (!suffix) return null;
  const trimmed = suffix.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 20) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Order suffix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidPurchaseNumberFormatError(
      "Purchase Order suffix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates purchase order next sequence number.
 */
export const validatePurchaseOrderNextNumber = (num: number): number => {
  if (!Number.isSafeInteger(num) || num < 1 || num > 999_999_999) {
    throw new InvalidPurchaseNumberFormatError(
      "Sequence number must be a valid integer between 1 and 999,999,999.",
    );
  }
  return num;
};

/**
 * Validates purchase order padding digits.
 */
export const validatePurchaseOrderPadding = (padding: number): number => {
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw new InvalidPurchaseNumberFormatError(
      "Padding must be an integer between 1 and 10.",
    );
  }
  return padding;
};

/**
 * Validates default delivery days (between 1 and 365).
 */
export const validateDefaultDeliveryDays = (days: number): number => {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new PurchaseSettingsDomainError(
      "Default delivery period must be between 1 and 365 days.",
    );
  }
  return days;
};

/**
 * Validates default payment terms length.
 */
export const validateDefaultPaymentTerms = (
  terms?: string | null,
): string | null => {
  if (!terms) return null;
  const trimmed = terms.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 100) {
    throw new PurchaseSettingsDomainError(
      "Default payment terms cannot exceed 100 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default purchase order notes length.
 */
export const validatePurchaseDefaultNotes = (
  notes?: string | null,
): string | null => {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new PurchaseSettingsDomainError(
      "Default notes cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default purchase order terms length.
 */
export const validatePurchaseDefaultTerms = (
  terms?: string | null,
): string | null => {
  if (!terms) return null;
  const trimmed = terms.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new PurchaseSettingsDomainError(
      "Default terms & conditions cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};
