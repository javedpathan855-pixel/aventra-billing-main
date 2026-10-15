import { describe, expect, it } from "vitest";
import {
  formatEstimateNumber,
  formatSalesOrderNumber,
  formatDeliveryChallanNumber,
  formatSalesReturnNumber,
  DEFAULT_SALES_SETTINGS,
  validateDefaultValidityDays,
  validateDefaultDeliveryDays,
  validateEstimateNextNumber,
  validateEstimatePadding,
  validateEstimatePrefix,
  validateEstimateSuffix,
  validateSalesOrderNextNumber,
  validateSalesOrderPadding,
  validateSalesOrderPrefix,
  validateSalesOrderSuffix,
  validateSalesDefaultNotes,
  validateSalesDefaultTerms,
} from "./sales-settings-rules";
import {
  InvalidSalesNumberFormatError,
  SalesSettingsDomainError,
} from "../errors/sales-settings-errors";

describe("Sales Settings Domain Rules & Formatters", () => {
  describe("Document Number Formatters", () => {
    it("formats estimate numbers with prefix, padding, and optional suffix", () => {
      expect(
        formatEstimateNumber({
          prefix: "EST-",
          nextNumber: 1,
          padding: 4,
          suffix: null,
        }),
      ).toBe("EST-0001");

      expect(
        formatEstimateNumber({
          prefix: "QT-",
          nextNumber: 42,
          padding: 5,
          suffix: "-26",
        }),
      ).toBe("QT-00042-26");
    });

    it("formats sales order numbers properly", () => {
      expect(
        formatSalesOrderNumber({
          prefix: "SO-",
          nextNumber: 15,
          padding: 4,
          suffix: null,
        }),
      ).toBe("SO-0015");
    });

    it("formats delivery challan numbers properly", () => {
      expect(
        formatDeliveryChallanNumber({
          prefix: "DC-",
          nextNumber: 7,
          padding: 4,
          suffix: null,
        }),
      ).toBe("DC-0007");

      expect(
        formatDeliveryChallanNumber({
          prefix: "CHAL/",
          nextNumber: 103,
          padding: 6,
          suffix: "/2026",
        }),
      ).toBe("CHAL/000103/2026");
    });

    it("formats sales return numbers properly", () => {
      expect(
        formatSalesReturnNumber({
          prefix: "SR-",
          nextNumber: 3,
          padding: 4,
          suffix: null,
        }),
      ).toBe("SR-0003");

      expect(
        formatSalesReturnNumber({
          prefix: "RET-",
          nextNumber: 88,
          padding: 4,
          suffix: "-A",
        }),
      ).toBe("RET-0088-A");
    });
  });

  describe("Default Settings", () => {
    it("exposes defaults for all four sales operation categories", () => {
      expect(DEFAULT_SALES_SETTINGS.estimatePrefix).toBe("EST-");
      expect(DEFAULT_SALES_SETTINGS.salesOrderPrefix).toBe("SO-");
      expect(DEFAULT_SALES_SETTINGS.deliveryChallanPrefix).toBe("DC-");
      expect(DEFAULT_SALES_SETTINGS.salesReturnPrefix).toBe("SR-");
      expect(DEFAULT_SALES_SETTINGS.defaultValidityDays).toBe(30);
      expect(DEFAULT_SALES_SETTINGS.defaultDeliveryDays).toBe(15);
      expect(DEFAULT_SALES_SETTINGS.defaultReturnReason).toBeDefined();
    });
  });

  describe("Number Validators", () => {
    it("formats estimate numbers with standard prefix, padding, and counter", () => {
      expect(
        formatEstimateNumber({
          prefix: "EST-",
          nextNumber: 1,
          padding: 4,
        }),
      ).toBe("EST-0001");

      expect(
        formatEstimateNumber({
          prefix: "QT-",
          nextNumber: 42,
          padding: 5,
          suffix: "/26",
        }),
      ).toBe("QT-00042/26");
    });

    it("formats sales order numbers with standard prefix, padding, and counter", () => {
      expect(
        formatSalesOrderNumber({
          prefix: "SO-",
          nextNumber: 1,
          padding: 4,
        }),
      ).toBe("SO-0001");

      expect(
        formatSalesOrderNumber({
          prefix: "ORD/",
          nextNumber: 15,
          padding: 6,
          suffix: "/2026",
        }),
      ).toBe("ORD/000015/2026");
    });

    it("throws for invalid sequence numbers in formatter", () => {
      expect(() =>
        formatEstimateNumber({
          prefix: "EST-",
          nextNumber: 0,
          padding: 4,
        }),
      ).toThrow(InvalidSalesNumberFormatError);

      expect(() =>
        formatSalesOrderNumber({
          prefix: "SO-",
          nextNumber: -5,
          padding: 4,
        }),
      ).toThrow(InvalidSalesNumberFormatError);
    });

    it("validates prefix correctly for estimates and sales orders", () => {
      expect(validateEstimatePrefix("EST-")).toBe("EST-");
      expect(validateSalesOrderPrefix("SO-")).toBe("SO-");
      expect(validateSalesOrderPrefix("ORD_")).toBe("ORD_");

      expect(() => validateEstimatePrefix("")).toThrow(
        InvalidSalesNumberFormatError,
      );
      expect(() => validateSalesOrderPrefix("   ")).toThrow(
        InvalidSalesNumberFormatError,
      );
      expect(() => validateSalesOrderPrefix("TOOLONGPREFIXTOOLONG21CHARS")).toThrow(
        InvalidSalesNumberFormatError,
      );
      expect(() => validateSalesOrderPrefix("SO@#$")).toThrow(
        InvalidSalesNumberFormatError,
      );
    });

    it("validates suffix correctly for estimates and sales orders", () => {
      expect(validateEstimateSuffix(null)).toBeNull();
      expect(validateSalesOrderSuffix("")).toBeNull();
      expect(validateSalesOrderSuffix("/FY26")).toBe("/FY26");

      expect(() => validateSalesOrderSuffix("TOOLONGSUFFIXTOOLONG21CHARS")).toThrow(
        InvalidSalesNumberFormatError,
      );
      expect(() => validateSalesOrderSuffix("SUF$*&")).toThrow(
        InvalidSalesNumberFormatError,
      );
    });

    it("validates sequence number range for estimates and sales orders", () => {
      expect(validateEstimateNextNumber(1)).toBe(1);
      expect(validateSalesOrderNextNumber(999999)).toBe(999999);

      expect(() => validateSalesOrderNextNumber(0)).toThrow(
        InvalidSalesNumberFormatError,
      );
      expect(() => validateSalesOrderNextNumber(-10)).toThrow(
        InvalidSalesNumberFormatError,
      );
      expect(() => validateSalesOrderNextNumber(1_000_000_000)).toThrow(
        InvalidSalesNumberFormatError,
      );
    });

    it("validates digit padding range (1 to 10)", () => {
      expect(validateEstimatePadding(4)).toBe(4);
      expect(validateSalesOrderPadding(1)).toBe(1);
      expect(validateSalesOrderPadding(10)).toBe(10);

      expect(() => validateSalesOrderPadding(0)).toThrow(
        InvalidSalesNumberFormatError,
      );
      expect(() => validateSalesOrderPadding(11)).toThrow(
        InvalidSalesNumberFormatError,
      );
    });

    it("validates default validity days and delivery days", () => {
      expect(validateDefaultValidityDays(30)).toBe(30);
      expect(validateDefaultDeliveryDays(15)).toBe(15);
      expect(validateDefaultDeliveryDays(1)).toBe(1);
      expect(validateDefaultDeliveryDays(365)).toBe(365);

      expect(() => validateDefaultValidityDays(0)).toThrow(
        SalesSettingsDomainError,
      );
      expect(() => validateDefaultDeliveryDays(366)).toThrow(
        SalesSettingsDomainError,
      );
      expect(() => validateDefaultDeliveryDays(-5)).toThrow(
        SalesSettingsDomainError,
      );
    });

    it("validates default notes and terms text limits", () => {
      expect(validateSalesDefaultNotes("Standard notes")).toBe("Standard notes");
      expect(validateSalesDefaultNotes("")).toBeNull();
      expect(validateSalesDefaultNotes(null)).toBeNull();

      const tooLong = "a".repeat(2001);
      expect(() => validateSalesDefaultNotes(tooLong)).toThrow(
        SalesSettingsDomainError,
      );
      expect(() => validateSalesDefaultTerms(tooLong)).toThrow(
        SalesSettingsDomainError,
      );
    });
  });
});
