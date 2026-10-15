import type { SupplierGstTreatment, SupplierStatus } from "../entities/supplier";
import { InvalidSupplierStatusTransitionError } from "../errors/supplier-errors";

// Indian tax-identifier formats are government-specified and stable. These
// validators mirror the established customer-domain rules so supplier tax
// data follows identical semantics without reaching into another feature's
// private internals (rule 08). A future cross-feature cleanup may consolidate
// tax-identifier math into a feature-agnostic shared utility.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,16}$/;
const GSTIN_REGEX =
  /^[0-9]{2}(?:[A-Z]{5}[0-9]{4}[A-Z]|[A-Z]{4}[0-9]{5}[A-Z])[1-9A-Z][0-9A-Z]{2}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;

export const GSTIN_LENGTH = 15;
export const PAN_LENGTH = 10;

/** Valid 2-digit Indian GST state and territory codes */
export const VALID_GST_STATE_CODES = new Set([
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
  "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
  "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
  "31", "32", "33", "34", "35", "36", "37", "38", "97", "99",
]);

export const isGstinRequired = (treatment: SupplierGstTreatment): boolean => {
  return (
    treatment === "REGISTERED_BUSINESS_REGULAR" ||
    treatment === "SPECIAL_ECONOMIC_ZONE" ||
    treatment === "COMPOSITION_SCHEME"
  );
};

export const isValidGstStateCode = (code: string): boolean => {
  return VALID_GST_STATE_CODES.has(code);
};

export const isValidPanFormat = (pan: string): boolean => {
  const cleaned = pan.trim().toUpperCase();
  return (
    cleaned.length === PAN_LENGTH &&
    (PAN_REGEX.test(cleaned) || TAN_REGEX.test(cleaned))
  );
};

export const isValidGstinFormat = (gstin: string): boolean => {
  const cleaned = gstin.trim().toUpperCase();
  if (cleaned.length !== GSTIN_LENGTH || !GSTIN_REGEX.test(cleaned)) {
    return false;
  }
  const stateCode = cleaned.slice(0, 2);
  if (!isValidGstStateCode(stateCode)) {
    return false;
  }
  const embeddedId = cleaned.slice(2, 12);
  return isValidPanFormat(embeddedId);
};

/**
 * Extracts the 10-character PAN/TAN embedded in an Indian GSTIN (characters 3-12).
 * Returns null if the candidate PAN/TAN segment is not structurally valid.
 */
export const derivePanFromGstin = (gstNumber: string): string | null => {
  const cleaned = gstNumber.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length >= 12) {
    const candidatePan = cleaned.slice(2, 12);
    if (isValidPanFormat(candidatePan)) {
      return candidatePan;
    }
  }
  return null;
};

export const isValidEmailFormat = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

export const isValidPhoneFormat = (phone: string): boolean => {
  return PHONE_REGEX.test(phone.trim());
};

export const ALLOWED_SUPPLIER_STATUS_TRANSITIONS: Record<
  SupplierStatus,
  readonly SupplierStatus[]
> = {
  ACTIVE: ["INACTIVE"],
  INACTIVE: ["ACTIVE"],
};

export const canTransitionSupplierStatus = (
  from: SupplierStatus,
  to: SupplierStatus,
): boolean => {
  if (from === to) return true;
  return ALLOWED_SUPPLIER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
};

export const assertValidSupplierStatusTransition = (
  from: SupplierStatus,
  to: SupplierStatus,
): void => {
  if (!canTransitionSupplierStatus(from, to)) {
    throw new InvalidSupplierStatusTransitionError(from, to);
  }
};
