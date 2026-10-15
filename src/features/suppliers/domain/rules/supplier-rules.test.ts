import { describe, expect, it } from "vitest";
import {
  assertValidSupplierStatusTransition,
  canTransitionSupplierStatus,
  derivePanFromGstin,
  isGstinRequired,
  isValidEmailFormat,
  isValidGstinFormat,
  isValidPanFormat,
  isValidPhoneFormat,
  isValidGstStateCode,
} from "./supplier-rules";
import { InvalidSupplierStatusTransitionError } from "../errors/supplier-errors";
import { formatSupplierAddress, getSupplierInitials } from "../entities/supplier";

describe("supplier domain rules", () => {
  it("accepts structurally valid GSTIN values", () => {
    expect(isValidGstinFormat("27AABCS1234F1Z5")).toBe(true);
    expect(isValidGstinFormat(" 27aabcs1234f1z5 ")).toBe(true);
  });

  it("rejects malformed GSTIN values", () => {
    expect(isValidGstinFormat("")).toBe(false);
    expect(isValidGstinFormat("27AABCS1234F1Z")).toBe(false);
    expect(isValidGstinFormat("00AABCS1234F1Z5")).toBe(false);
    expect(isValidGstinFormat("27AABCS1234F1Z9".slice(0, 10))).toBe(false);
  });

  it("accepts valid PAN values and derives PAN from GSTIN", () => {
    expect(isValidPanFormat("AABCS1234F")).toBe(true);
    expect(derivePanFromGstin("27AABCS1234F1Z5")).toBe("AABCS1234F");
    expect(derivePanFromGstin("not-a-gstin")).toBeNull();
  });

  it("requires GSTIN only for registered treatments", () => {
    expect(isGstinRequired("REGISTERED_BUSINESS_REGULAR")).toBe(true);
    expect(isGstinRequired("SPECIAL_ECONOMIC_ZONE")).toBe(true);
    expect(isGstinRequired("COMPOSITION_SCHEME")).toBe(true);
    expect(isGstinRequired("CONSUMER_UNREGISTERED")).toBe(false);
    expect(isGstinRequired("OVERSEAS_EXPORT")).toBe(false);
    expect(isGstinRequired("DEEMED_EXPORT")).toBe(false);
  });

  it("validates email, phone, and GST state codes", () => {
    expect(isValidEmailFormat("accounts@supplier.in")).toBe(true);
    expect(isValidEmailFormat("not-an-email")).toBe(false);
    expect(isValidPhoneFormat("+91 98220 54321")).toBe(true);
    expect(isValidPhoneFormat("123")).toBe(false);
    expect(isValidGstStateCode("27")).toBe(true);
    expect(isValidGstStateCode("00")).toBe(false);
  });

  it("allows ACTIVE <-> INACTIVE transitions and treats same-status as a no-op", () => {
    expect(canTransitionSupplierStatus("ACTIVE", "INACTIVE")).toBe(true);
    expect(canTransitionSupplierStatus("INACTIVE", "ACTIVE")).toBe(true);
    expect(canTransitionSupplierStatus("ACTIVE", "ACTIVE")).toBe(true);
    expect(() =>
      assertValidSupplierStatusTransition("ACTIVE", "ARCHIVED" as never),
    ).toThrow(InvalidSupplierStatusTransitionError);
  });

  it("derives initials and formats addresses", () => {
    expect(getSupplierInitials("Shree Balaji Traders")).toBe("ST");
    expect(getSupplierInitials("  ")).toBe("SU");
    expect(
      formatSupplierAddress({
        addressLine1: "14 MG Road",
        city: "Pune",
        state: "Maharashtra",
        pinCode: "411001",
      }),
    ).toBe("14 MG Road, Pune, Maharashtra, 411001");
    expect(formatSupplierAddress(null)).toBe("");
  });
});
