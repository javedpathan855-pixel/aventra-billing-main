import type { HsnSacType } from "../entities/hsn-sac-code";
import { normalizeHsnSacCode } from "../entities/hsn-sac-code";

export const HSN_SHEET_NAME = "HSN_MSTR";

export const SAC_SHEET_NAME = "SAC_MSTR";

export const HSN_EXPECTED_HEADERS = ["HSN_CD", "HSN_Description"] as const;

export const SAC_EXPECTED_HEADERS = ["SAC_CD", "SAC_Description"] as const;

export const HSN_SAC_CODE_MIN_LENGTH = 2;

export const HSN_SAC_CODE_MAX_LENGTH = 8;

export const expectedHeadersFor = (type: HsnSacType): readonly string[] =>
  type === "HSN" ? HSN_EXPECTED_HEADERS : SAC_EXPECTED_HEADERS;

export const resolveSheetType = (sheetName: string): HsnSacType | null => {
  if (sheetName === HSN_SHEET_NAME) return "HSN";
  if (sheetName === SAC_SHEET_NAME) return "SAC";
  return null;
};

export const validateWorkbookHeaders = (type: HsnSacType, headers: unknown[]): boolean => {
  const expected = expectedHeadersFor(type);
  if (headers.length < expected.length) return false;
  return expected.every((h, index) => String(headers[index] ?? "").trim() === h);
};

export const validateHsnSacCodeFormat = (code: string): boolean =>
  new RegExp(`^\\d{${HSN_SAC_CODE_MIN_LENGTH},${HSN_SAC_CODE_MAX_LENGTH}}$`).test(code);

/**
 * Normalizes a raw workbook code cell. Shared-string cells arrive as text
 * (leading zeros intact); numeric cells arrive as numbers. Internal
 * whitespace (e.g. "2307 00") is removed. Returns null when the cell cannot
 * represent a code.
 */
export const normalizeWorkbookCode = (raw: unknown): string | null => {
  if (typeof raw === "number") {
    if (!Number.isInteger(raw) || raw < 0) return null;
    return String(raw);
  }
  if (typeof raw === "bigint") {
    if (raw < 0) return null;
    return String(raw);
  }
  if (typeof raw === "string") {
    const normalized = normalizeHsnSacCode(raw);
    return normalized.length > 0 ? normalized : null;
  }
  return null;
};

/** Trims and collapses internal whitespace; numbers become their string form. */
export const normalizeWorkbookDescription = (raw: unknown): string | null => {
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
};

export type WorkbookSheetInput = {
  sheetName: string;
  headers: unknown[];
  /** Data rows only (header excluded); each row is [code, description, ...]. */
  rows: unknown[][];
};

export type AcceptedClassificationRow = {
  code: string;
  description: string;
};

export type RejectedClassificationRow = {
  rowNumber: number;
  rawCode: string;
  reason: string;
};

export type DuplicateClassificationRow = {
  rowNumber: number;
  code: string;
};

export type SheetParseOutcome = {
  type: HsnSacType;
  sheetName: string;
  headerError?: string;
  totalRows: number;
  accepted: AcceptedClassificationRow[];
  rejected: RejectedClassificationRow[];
  duplicates: DuplicateClassificationRow[];
  /** Accepted rows whose code needed whitespace normalization. */
  normalizedCount: number;
};

/**
 * Deterministic, pure sheet parser. Duplicate codes are reported (first
 * occurrence wins); malformed rows are rejected with stable reasons.
 * Row numbers are 1-based including the header row.
 */
export const parseWorkbookSheet = (
  type: HsnSacType,
  sheet: WorkbookSheetInput,
): SheetParseOutcome => {
  const outcome: SheetParseOutcome = {
    type,
    sheetName: sheet.sheetName,
    totalRows: sheet.rows.length,
    accepted: [],
    rejected: [],
    duplicates: [],
    normalizedCount: 0,
  };

  if (!validateWorkbookHeaders(type, sheet.headers)) {
    outcome.headerError = `Expected headers [${expectedHeadersFor(type).join(", ")}] but found [${sheet.headers.map((h) => String(h ?? "")).join(", ")}].`;
    return outcome;
  }

  const seen = new Set<string>();

  sheet.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rawCode = row[0];
    const rawDescription = row[1];
    const rawCodeText = rawCode === null || rawCode === undefined ? "" : String(rawCode).slice(0, 80);

    const code = normalizeWorkbookCode(rawCode);
    if (code === null) {
      outcome.rejected.push({ rowNumber, rawCode: rawCodeText, reason: "blank code" });
      return;
    }
    if (!validateHsnSacCodeFormat(code)) {
      outcome.rejected.push({ rowNumber, rawCode: rawCodeText, reason: "malformed code" });
      return;
    }
    const description = normalizeWorkbookDescription(rawDescription);
    if (description === null) {
      outcome.rejected.push({ rowNumber, rawCode: rawCodeText, reason: "blank description" });
      return;
    }
    if (seen.has(code)) {
      outcome.duplicates.push({ rowNumber, code });
      return;
    }
    seen.add(code);
    if (typeof rawCode === "string" && rawCode !== code) {
      outcome.normalizedCount += 1;
    }
    outcome.accepted.push({ code, description });
  });

  return outcome;
};
