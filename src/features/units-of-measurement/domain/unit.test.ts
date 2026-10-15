import { describe, expect, it } from "vitest";
import { normalizeUnitCode } from "./entities/unit";
import {
  countQuantityDecimals,
  DEFAULT_UNITS,
  validateQuantityPrecision,
  validateUnitCode,
  validateUnitName,
  validateUnitPrecision,
} from "./rules/unit-rules";
import { InvalidUnitPrecisionError, UnitDomainError } from "./errors/unit-errors";

describe("unit domain rules", () => {
  it("normalizes codes to uppercase without whitespace", () => {
    expect(normalizeUnitCode(" pcs ")).toBe("PCS");
    expect(validateUnitCode("kgs")).toBe("KGS");
  });

  it("rejects invalid codes and names", () => {
    expect(() => validateUnitCode("PC-S")).toThrow(UnitDomainError);
    expect(() => validateUnitCode("x".repeat(13))).toThrow(UnitDomainError);
    expect(() => validateUnitName("A")).toThrow(UnitDomainError);
  });

  it("constrains precision to the line-quantity scale", () => {
    expect(validateUnitPrecision(0)).toBe(0);
    expect(validateUnitPrecision(3)).toBe(3);
    expect(() => validateUnitPrecision(4)).toThrow(InvalidUnitPrecisionError);
    expect(() => validateUnitPrecision(1.5)).toThrow(InvalidUnitPrecisionError);
  });

  it("counts quantity decimals safely", () => {
    expect(countQuantityDecimals(2)).toBe(0);
    expect(countQuantityDecimals(2.5)).toBe(1);
    expect(countQuantityDecimals(2.125)).toBe(3);
    expect(validateQuantityPrecision(1.5, 0)).toBe(false);
    expect(validateQuantityPrecision(1.5, 1)).toBe(true);
  });

  it("ships the legacy standard units as seed data", () => {
    expect(DEFAULT_UNITS.map((u) => u.code)).toEqual([
      "PCS", "NOS", "KGS", "MTR", "BOX", "SET", "HRS", "DAYS", "MONTHS", "VISIT", "JOB",
    ]);
  });
});
