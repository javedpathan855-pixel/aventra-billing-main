import { describe, expect, it } from "vitest";
import {
  expectedHsnSacTypeForItemType,
  hsnSacRecordId,
  normalizeHsnSacCode,
} from "./entities/hsn-sac-code";
import {
  normalizeWorkbookCode,
  normalizeWorkbookDescription,
  parseWorkbookSheet,
  resolveSheetType,
  validateHsnSacCodeFormat,
  validateWorkbookHeaders,
} from "./rules/hsn-sac-rules";

describe("hsn-sac domain rules", () => {
  it("preserves code strings exactly, including leading zeros", () => {
    expect(normalizeHsnSacCode(" 01 ")).toBe("01");
    expect(normalizeHsnSacCode("2307 00")).toBe("230700");
    expect(normalizeWorkbookCode("01")).toBe("01");
    expect(normalizeWorkbookCode(99)).toBe("99");
    expect(normalizeWorkbookCode(9954)).toBe("9954");
    expect(normalizeWorkbookCode("")).toBeNull();
    expect(normalizeWorkbookCode(9.5)).toBeNull();
  });

  it("validates the 2-to-8 digit code format", () => {
    expect(validateHsnSacCodeFormat("01")).toBe(true);
    expect(validateHsnSacCodeFormat("84713010")).toBe(true);
    expect(validateHsnSacCodeFormat("9")).toBe(false);
    expect(validateHsnSacCodeFormat("123456789")).toBe(false);
    expect(validateHsnSacCodeFormat("ABC")).toBe(false);
  });

  it("normalizes descriptions safely", () => {
    expect(normalizeWorkbookDescription("  LIVE   ANIMALS ")).toBe("LIVE ANIMALS");
    expect(normalizeWorkbookDescription("")).toBeNull();
    expect(normalizeWorkbookDescription(null)).toBeNull();
  });

  it("resolves sheet names and validates headers", () => {
    expect(resolveSheetType("HSN_MSTR")).toBe("HSN");
    expect(resolveSheetType("SAC_MSTR")).toBe("SAC");
    expect(resolveSheetType("OTHER")).toBeNull();
    expect(validateWorkbookHeaders("HSN", ["HSN_CD", "HSN_Description"])).toBe(true);
    expect(validateWorkbookHeaders("HSN", ["HSN_CD", "WRONG"])).toBe(false);
    expect(validateWorkbookHeaders("SAC", ["SAC_CD"])).toBe(false);
  });

  it("maps products to HSN and services to SAC with stable record ids", () => {
    expect(expectedHsnSacTypeForItemType("PRODUCT")).toBe("HSN");
    expect(expectedHsnSacTypeForItemType("SERVICE")).toBe("SAC");
    expect(hsnSacRecordId("HSN", "01")).toBe("HSN:01");
  });

  it("parses sheets deterministically with explicit rejections", () => {
    const first = parseWorkbookSheet("HSN", {
      sheetName: "HSN_MSTR",
      headers: ["HSN_CD", "HSN_Description"],
      rows: [
        ["01", "LIVE ANIMALS"],
        ["2307 00", "SPACED CODE"],
        ["", "BLANK CODE"],
        ["ABC", "BAD CODE"],
        ["0101", ""],
        ["01", "DUPLICATE"],
      ],
    });

    expect(first.totalRows).toBe(6);
    expect(first.accepted).toEqual([
      { code: "01", description: "LIVE ANIMALS" },
      { code: "230700", description: "SPACED CODE" },
    ]);
    expect(first.normalizedCount).toBe(1);
    expect(first.rejected.map((r) => r.reason)).toEqual([
      "blank code",
      "malformed code",
      "blank description",
    ]);
    expect(first.duplicates).toEqual([{ rowNumber: 7, code: "01" }]);

    const second = parseWorkbookSheet("HSN", {
      sheetName: "HSN_MSTR",
      headers: ["HSN_CD", "HSN_Description"],
      rows: [["01", "LIVE ANIMALS"]],
    });
    expect(second).toEqual({ ...first, totalRows: 1, accepted: [{ code: "01", description: "LIVE ANIMALS" }], rejected: [], duplicates: [], normalizedCount: 0 });
  });

  it("rejects sheets with unexpected headers", () => {
    const outcome = parseWorkbookSheet("SAC", {
      sheetName: "SAC_MSTR",
      headers: ["CODE", "DESC"],
      rows: [["99", "All Services"]],
    });
    expect(outcome.headerError).toContain("SAC_CD");
    expect(outcome.accepted).toEqual([]);
  });
});
