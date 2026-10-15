import { describe, expect, it } from "vitest";
import {
  DEFAULT_PURCHASE_SETTINGS,
  formatPurchaseOrderNumber,
  formatPurchaseBillNumber,
  validatePurchaseOrderPrefix,
  validatePurchaseOrderNextNumber,
  validateDefaultDeliveryDays,
  validatePurchaseBillPrefix,
  validatePurchaseBillNextNumber,
  validateDefaultDueDays,
  formatPurchaseReturnNumber,
  validatePurchaseReturnPrefix,
  validatePurchaseReturnNextNumber,
} from "./purchase-settings-rules";
import { InvalidPurchaseNumberFormatError } from "../errors/purchase-settings-errors";

describe("purchase-settings numbering rules", () => {
  it("exposes PO- defaults", () => {
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseOrderPrefix).toBe("PO-");
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseOrderNextNumber).toBe(1);
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseOrderPadding).toBe(4);
    expect(DEFAULT_PURCHASE_SETTINGS.defaultDeliveryDays).toBe(15);
  });

  it("formats the first purchase order number as PO-0001", () => {
    expect(
      formatPurchaseOrderNumber({
        prefix: "PO-",
        nextNumber: 1,
        padding: 4,
        suffix: null,
      }),
    ).toBe("PO-0001");
  });

  it("applies custom prefix, padding, and suffix", () => {
    expect(
      formatPurchaseOrderNumber({
        prefix: "PUR/",
        nextNumber: 42,
        padding: 6,
        suffix: "/26",
      }),
    ).toBe("PUR/000042/26");
  });

  it("rejects non-positive sequence numbers", () => {
    expect(() =>
      formatPurchaseOrderNumber({ prefix: "PO-", nextNumber: 0, padding: 4 }),
    ).toThrow(InvalidPurchaseNumberFormatError);
  });

  it("validates prefix characters and sequence bounds", () => {
    expect(validatePurchaseOrderPrefix("PO-")).toBe("PO-");
    expect(() => validatePurchaseOrderPrefix("")).toThrow(
      InvalidPurchaseNumberFormatError,
    );
    expect(() => validatePurchaseOrderPrefix("PO#")).toThrow(
      InvalidPurchaseNumberFormatError,
    );
    expect(validatePurchaseOrderNextNumber(999)).toBe(999);
    expect(() => validatePurchaseOrderNextNumber(0)).toThrow(
      InvalidPurchaseNumberFormatError,
    );
  });

  it("validates the delivery window bounds", () => {
    expect(validateDefaultDeliveryDays(15)).toBe(15);
    expect(() => validateDefaultDeliveryDays(0)).toThrow();
    expect(() => validateDefaultDeliveryDays(366)).toThrow();
  });

  it("exposes PB- bill defaults", () => {
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseBillPrefix).toBe("PB-");
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseBillNextNumber).toBe(1);
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseBillPadding).toBe(4);
    expect(DEFAULT_PURCHASE_SETTINGS.defaultDueDays).toBe(30);
  });

  it("formats the first purchase bill number as PB-0001", () => {
    expect(
      formatPurchaseBillNumber({
        prefix: "PB-",
        nextNumber: 1,
        padding: 4,
        suffix: null,
      }),
    ).toBe("PB-0001");
  });

  it("applies custom bill prefix, padding, and suffix", () => {
    expect(
      formatPurchaseBillNumber({
        prefix: "BILL/",
        nextNumber: 42,
        padding: 6,
        suffix: "/26",
      }),
    ).toBe("BILL/000042/26");
  });

  it("rejects non-positive bill sequence numbers", () => {
    expect(() =>
      formatPurchaseBillNumber({ prefix: "PB-", nextNumber: 0, padding: 4 }),
    ).toThrow(InvalidPurchaseNumberFormatError);
  });

  it("validates bill prefix characters and sequence bounds", () => {
    expect(validatePurchaseBillPrefix("PB-")).toBe("PB-");
    expect(() => validatePurchaseBillPrefix("")).toThrow(
      InvalidPurchaseNumberFormatError,
    );
    expect(() => validatePurchaseBillPrefix("PB#")).toThrow(
      InvalidPurchaseNumberFormatError,
    );
    expect(validatePurchaseBillNextNumber(999)).toBe(999);
    expect(() => validatePurchaseBillNextNumber(0)).toThrow(
      InvalidPurchaseNumberFormatError,
    );
  });

  it("validates the due window bounds", () => {
    expect(validateDefaultDueDays(30)).toBe(30);
    expect(() => validateDefaultDueDays(0)).toThrow();
    expect(() => validateDefaultDueDays(366)).toThrow();
  });

  it("exposes PR- return defaults", () => {
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseReturnPrefix).toBe("PR-");
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseReturnNextNumber).toBe(1);
    expect(DEFAULT_PURCHASE_SETTINGS.purchaseReturnPadding).toBe(4);
    expect(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseReturnReason).toBe(
      "Defective or damaged in transit",
    );
  });

  it("formats the first purchase return number as PR-0001", () => {
    expect(
      formatPurchaseReturnNumber({
        prefix: "PR-",
        nextNumber: 1,
        padding: 4,
        suffix: null,
      }),
    ).toBe("PR-0001");
  });

  it("rejects non-positive return sequence numbers", () => {
    expect(() =>
      formatPurchaseReturnNumber({ prefix: "PR-", nextNumber: 0, padding: 4 }),
    ).toThrow(InvalidPurchaseNumberFormatError);
  });

  it("validates return prefix characters and sequence bounds", () => {
    expect(validatePurchaseReturnPrefix("PR-")).toBe("PR-");
    expect(() => validatePurchaseReturnPrefix("")).toThrow(
      InvalidPurchaseNumberFormatError,
    );
    expect(() => validatePurchaseReturnPrefix("PR#")).toThrow(
      InvalidPurchaseNumberFormatError,
    );
    expect(validatePurchaseReturnNextNumber(999)).toBe(999);
    expect(() => validatePurchaseReturnNextNumber(0)).toThrow(
      InvalidPurchaseNumberFormatError,
    );
  });
});
