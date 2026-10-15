import { InvalidUnitPrecisionError, UnitDomainError } from "../errors/unit-errors";
import { normalizeUnitCode } from "../entities/unit";

export const UNIT_CODE_MAX_LENGTH = 12;

export const UNIT_NAME_MIN_LENGTH = 2;

export const UNIT_NAME_MAX_LENGTH = 100;

export const UNIT_DESCRIPTION_MAX_LENGTH = 500;

/** Line-quantity storage scale — per-unit precision never exceeds this. */
export const MAX_UNIT_PRECISION = 3;

export const validateUnitName = (name: string): string => {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (normalized.length < UNIT_NAME_MIN_LENGTH) {
    throw new UnitDomainError("Unit name must be at least 2 characters.");
  }
  if (normalized.length > UNIT_NAME_MAX_LENGTH) {
    throw new UnitDomainError("Unit name cannot exceed 100 characters.");
  }
  return normalized;
};

export const validateUnitCode = (code: string): string => {
  const normalized = normalizeUnitCode(code);
  if (normalized.length < 1 || normalized.length > UNIT_CODE_MAX_LENGTH) {
    throw new UnitDomainError("Unit code must be between 1 and 12 characters.");
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    throw new UnitDomainError("Unit code may only contain letters and digits.");
  }
  return normalized;
};

export const validateUnitPrecision = (precision: number): number => {
  if (!Number.isInteger(precision) || precision < 0 || precision > MAX_UNIT_PRECISION) {
    throw new InvalidUnitPrecisionError();
  }
  return precision;
};

export const countQuantityDecimals = (quantity: number): number => {
  if (!Number.isFinite(quantity)) return 0;
  const rounded = Math.round(quantity * 1000) / 1000;
  const text = String(rounded);
  if (text.includes("e") || text.includes("E")) return MAX_UNIT_PRECISION;
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
};

export const validateQuantityPrecision = (quantity: number, precision: number): boolean =>
  countQuantityDecimals(quantity) <= precision;

/**
 * Standard units shipped as seed data. Precision 3 matches the Decimal(12,3)
 * line-quantity scale; organizations tighten per-unit precision deliberately.
 */
export const DEFAULT_UNITS: readonly { code: string; name: string; description: string }[] = [
  { code: "PCS", name: "Pieces", description: "Individual pieces or counts." },
  { code: "NOS", name: "Numbers", description: "Countable numbers of items." },
  { code: "KGS", name: "Kilograms", description: "Weight measured in kilograms." },
  { code: "MTR", name: "Meters", description: "Length measured in meters." },
  { code: "BOX", name: "Boxes", description: "Packaged boxes." },
  { code: "SET", name: "Sets", description: "Grouped sets of items." },
  { code: "HRS", name: "Hours", description: "Time measured in hours." },
  { code: "DAYS", name: "Days", description: "Time measured in days." },
  { code: "MONTHS", name: "Months", description: "Time measured in months." },
  { code: "VISIT", name: "Visits", description: "Per-visit service charges." },
  { code: "JOB", name: "Jobs", description: "Fixed-scope jobs." },
];
