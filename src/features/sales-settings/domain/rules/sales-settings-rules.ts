import type {
  EstimateNumberComponents,
  SalesOrderNumberComponents,
  DeliveryChallanNumberComponents,
  SalesReturnNumberComponents,
} from "../entities/sales-settings";
import {
  InvalidSalesNumberFormatError,
  SalesSettingsDomainError,
} from "../errors/sales-settings-errors";

export const DEFAULT_SALES_SETTINGS = {
  estimatePrefix: "EST-",
  estimateSuffix: null as string | null,
  estimateNextNumber: 1,
  estimatePadding: 4,
  salesOrderPrefix: "SO-",
  salesOrderSuffix: null as string | null,
  salesOrderNextNumber: 1,
  salesOrderPadding: 4,
  deliveryChallanPrefix: "DC-",
  deliveryChallanSuffix: null as string | null,
  deliveryChallanNextNumber: 1,
  deliveryChallanPadding: 4,
  salesReturnPrefix: "SR-",
  salesReturnSuffix: null as string | null,
  salesReturnNextNumber: 1,
  salesReturnPadding: 4,
  defaultValidityDays: 30,
  defaultDeliveryDays: 15,
  defaultNotes:
    "Thank you for the opportunity to quote. Please review the proposal and contact us with any questions.",
  defaultTerms:
    "Prices are valid until the specified expiration date. Payment and delivery terms apply upon quotation acceptance.",
  defaultSalesOrderNotes:
    "Thank you for your business. We are processing your order and will keep you updated.",
  defaultSalesOrderTerms:
    "All goods remain the property of the seller until paid in full. Standard terms of delivery and returns apply.",
  defaultDeliveryInstructions:
    "Please verify the contents upon receipt and sign the delivery acknowledgement.",
  defaultDeliveryTerms:
    "Goods delivered are subject to physical inspection at destination. Any discrepancies must be reported within 48 hours.",
  defaultReturnReason: "Defective or damaged in transit",
  defaultReturnPolicy:
    "Goods returned within 15 days of delivery with original packing and invoices are eligible for return inspection and credit note adjustment.",
  label: "Sales & Document Settings",
  description: "Sales estimates, quotations, sales orders, delivery challans, and sales returns document numbering and defaults.",
} as const;

/**
 * Pure domain formatter that renders a human-readable estimate document number.
 * Example: { prefix: "EST-", nextNumber: 1, padding: 4 } => "EST-0001"
 */
export const formatEstimateNumber = (
  components: EstimateNumberComponents,
): string => {
  const prefix = (components.prefix || "").trim();
  const nextNum = Math.floor(components.nextNumber);
  const padding = Math.max(1, Math.min(10, components.padding || 4));
  const suffix = (components.suffix || "").trim();

  if (isNaN(nextNum) || nextNum < 1) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a positive integer greater than or equal to 1.",
    );
  }

  const paddedNumber = String(nextNum).padStart(padding, "0");
  return `${prefix}${paddedNumber}${suffix ? suffix : ""}`;
};

/**
 * Pure domain formatter that renders a human-readable sales order document number.
 * Example: { prefix: "SO-", nextNumber: 1, padding: 4 } => "SO-0001"
 */
export const formatSalesOrderNumber = (
  components: SalesOrderNumberComponents,
): string => {
  const prefix = (components.prefix || "").trim();
  const nextNum = Math.floor(components.nextNumber);
  const padding = Math.max(1, Math.min(10, components.padding || 4));
  const suffix = (components.suffix || "").trim();

  if (isNaN(nextNum) || nextNum < 1) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a positive integer greater than or equal to 1.",
    );
  }

  const paddedNumber = String(nextNum).padStart(padding, "0");
  return `${prefix}${paddedNumber}${suffix ? suffix : ""}`;
};

/**
 * Validates document number prefix.
 */
export const validateEstimatePrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    throw new InvalidSalesNumberFormatError("Estimate prefix cannot be empty.");
  }
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Estimate prefix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Estimate prefix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates sales order number prefix.
 */
export const validateSalesOrderPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    throw new InvalidSalesNumberFormatError("Sales Order prefix cannot be empty.");
  }
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Sales Order prefix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Sales Order prefix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates document number suffix.
 */
export const validateEstimateSuffix = (
  suffix?: string | null,
): string | null => {
  if (!suffix) return null;
  const trimmed = suffix.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Estimate suffix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Estimate suffix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates sales order suffix.
 */
export const validateSalesOrderSuffix = (
  suffix?: string | null,
): string | null => {
  if (!suffix) return null;
  const trimmed = suffix.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Sales Order suffix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Sales Order suffix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates next sequence number.
 */
export const validateEstimateNextNumber = (num: number): number => {
  if (!Number.isSafeInteger(num) || num < 1 || num > 999_999_999) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a valid integer between 1 and 999,999,999.",
    );
  }
  return num;
};

/**
 * Validates sales order next sequence number.
 */
export const validateSalesOrderNextNumber = (num: number): number => {
  if (!Number.isSafeInteger(num) || num < 1 || num > 999_999_999) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a valid integer between 1 and 999,999,999.",
    );
  }
  return num;
};

/**
 * Validates padding digits.
 */
export const validateEstimatePadding = (padding: number): number => {
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw new InvalidSalesNumberFormatError(
      "Padding must be an integer between 1 and 10.",
    );
  }
  return padding;
};

/**
 * Validates sales order padding digits.
 */
export const validateSalesOrderPadding = (padding: number): number => {
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw new InvalidSalesNumberFormatError(
      "Padding must be an integer between 1 and 10.",
    );
  }
  return padding;
};

/**
 * Validates default validity days (e.g. between 1 and 365).
 */
export const validateDefaultValidityDays = (days: number): number => {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new SalesSettingsDomainError(
      "Default validity period must be between 1 and 365 days.",
    );
  }
  return days;
};

/**
 * Validates default delivery days (e.g. between 1 and 365).
 */
export const validateDefaultDeliveryDays = (days: number): number => {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new SalesSettingsDomainError(
      "Default delivery period must be between 1 and 365 days.",
    );
  }
  return days;
};

/**
 * Validates default notes length.
 */
export const validateSalesDefaultNotes = (
  notes?: string | null,
): string | null => {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new SalesSettingsDomainError(
      "Default notes cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default terms length.
 */
export const validateSalesDefaultTerms = (
  terms?: string | null,
): string | null => {
  if (!terms) return null;
  const trimmed = terms.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new SalesSettingsDomainError(
      "Default terms & conditions cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Pure domain formatter that renders a human-readable delivery challan document number.
 * Example: { prefix: "DC-", nextNumber: 1, padding: 4 } => "DC-0001"
 */
export const formatDeliveryChallanNumber = (
  components: DeliveryChallanNumberComponents,
): string => {
  const prefix = (components.prefix || "").trim();
  const nextNum = Math.floor(components.nextNumber);
  const padding = Math.max(1, Math.min(10, components.padding || 4));
  const suffix = (components.suffix || "").trim();

  if (isNaN(nextNum) || nextNum < 1) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a positive integer greater than or equal to 1.",
    );
  }

  const paddedNumber = String(nextNum).padStart(padding, "0");
  return `${prefix}${paddedNumber}${suffix ? suffix : ""}`;
};

/**
 * Pure domain formatter that renders a human-readable sales return document number.
 * Example: { prefix: "SR-", nextNumber: 1, padding: 4 } => "SR-0001"
 */
export const formatSalesReturnNumber = (
  components: SalesReturnNumberComponents,
): string => {
  const prefix = (components.prefix || "").trim();
  const nextNum = Math.floor(components.nextNumber);
  const padding = Math.max(1, Math.min(10, components.padding || 4));
  const suffix = (components.suffix || "").trim();

  if (isNaN(nextNum) || nextNum < 1) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a positive integer greater than or equal to 1.",
    );
  }

  const paddedNumber = String(nextNum).padStart(padding, "0");
  return `${prefix}${paddedNumber}${suffix ? suffix : ""}`;
};

/**
 * Validates delivery challan number prefix.
 */
export const validateDeliveryChallanPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    throw new InvalidSalesNumberFormatError("Delivery Challan prefix cannot be empty.");
  }
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Delivery Challan prefix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Delivery Challan prefix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates delivery challan suffix.
 */
export const validateDeliveryChallanSuffix = (
  suffix?: string | null,
): string | null => {
  if (!suffix) return null;
  const trimmed = suffix.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Delivery Challan suffix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Delivery Challan suffix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates delivery challan next sequence number.
 */
export const validateDeliveryChallanNextNumber = (num: number): number => {
  if (!Number.isSafeInteger(num) || num < 1 || num > 999_999_999) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a valid integer between 1 and 999,999,999.",
    );
  }
  return num;
};

/**
 * Validates delivery challan padding digits.
 */
export const validateDeliveryChallanPadding = (padding: number): number => {
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw new InvalidSalesNumberFormatError(
      "Padding must be an integer between 1 and 10.",
    );
  }
  return padding;
};

/**
 * Validates sales return number prefix.
 */
export const validateSalesReturnPrefix = (prefix: string): string => {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) {
    throw new InvalidSalesNumberFormatError("Sales Return prefix cannot be empty.");
  }
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Sales Return prefix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Sales Return prefix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates sales return suffix.
 */
export const validateSalesReturnSuffix = (
  suffix?: string | null,
): string | null => {
  if (!suffix) return null;
  const trimmed = suffix.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 20) {
    throw new InvalidSalesNumberFormatError(
      "Sales Return suffix cannot exceed 20 characters.",
    );
  }
  const validPattern = /^[A-Za-z0-9\-_/]+$/;
  if (!validPattern.test(trimmed)) {
    throw new InvalidSalesNumberFormatError(
      "Sales Return suffix may only contain letters, numbers, hyphens, underscores, or slashes.",
    );
  }
  return trimmed;
};

/**
 * Validates sales return next sequence number.
 */
export const validateSalesReturnNextNumber = (num: number): number => {
  if (!Number.isSafeInteger(num) || num < 1 || num > 999_999_999) {
    throw new InvalidSalesNumberFormatError(
      "Sequence number must be a valid integer between 1 and 999,999,999.",
    );
  }
  return num;
};

/**
 * Validates sales return padding digits.
 */
export const validateSalesReturnPadding = (padding: number): number => {
  if (!Number.isInteger(padding) || padding < 1 || padding > 10) {
    throw new InvalidSalesNumberFormatError(
      "Padding must be an integer between 1 and 10.",
    );
  }
  return padding;
};

/**
 * Validates default delivery instructions.
 */
export const validateDefaultDeliveryInstructions = (
  notes?: string | null,
): string | null => {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new SalesSettingsDomainError(
      "Delivery instructions cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default delivery terms.
 */
export const validateDefaultDeliveryTerms = (
  terms?: string | null,
): string | null => {
  if (!terms) return null;
  const trimmed = terms.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new SalesSettingsDomainError(
      "Delivery terms cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default return reason.
 */
export const validateDefaultReturnReason = (
  reason?: string | null,
): string | null => {
  if (!reason) return null;
  const trimmed = reason.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 255) {
    throw new SalesSettingsDomainError(
      "Default return reason cannot exceed 255 characters.",
    );
  }
  return trimmed;
};

/**
 * Validates default return policy.
 */
export const validateDefaultReturnPolicy = (
  policy?: string | null,
): string | null => {
  if (!policy) return null;
  const trimmed = policy.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 2000) {
    throw new SalesSettingsDomainError(
      "Return policy cannot exceed 2000 characters.",
    );
  }
  return trimmed;
};
