import { describe, expect, it } from "vitest";
import { toDomainSupplier } from "./prisma-supplier-mapper";
import type { Supplier as PrismaSupplier } from "@/generated/prisma/client";

const baseRow: PrismaSupplier = {
  id: "sup-1",
  organizationId: "org-1",
  name: "Shree Balaji Traders",
  status: "ACTIVE",
  contactPerson: "Ramesh Gupta",
  email: "accounts@balaji.in",
  phone: "+91 98220 00000",
  alternatePhone: null,
  billingAddressLine1: "14 MG Road",
  billingAddressLine2: null,
  billingCity: "Pune",
  billingState: "Maharashtra",
  billingPinCode: "411001",
  billingCountry: "India",
  sameAsBillingAddress: true,
  shippingAddressLine1: "14 MG Road",
  shippingAddressLine2: null,
  shippingCity: "Pune",
  shippingState: "Maharashtra",
  shippingPinCode: "411001",
  shippingCountry: "India",
  gstTreatment: "REGISTERED_BUSINESS_REGULAR",
  gstin: "27AABCS1234F1Z5",
  pan: "AABCS1234F",
  currency: "INR (₹)",
  paymentTerms: "Net 30 days",
  internalNotes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("prisma-supplier-mapper", () => {
  it("maps a full database row to the domain entity", () => {
    const supplier = toDomainSupplier(baseRow);

    expect(supplier.id).toBe("sup-1");
    expect(supplier.status).toBe("ACTIVE");
    expect(supplier.billingAddress).toEqual({
      addressLine1: "14 MG Road",
      addressLine2: null,
      city: "Pune",
      state: "Maharashtra",
      pinCode: "411001",
      country: "India",
    });
    expect(supplier.gstin).toBe("27AABCS1234F1Z5");
    expect(supplier.createdAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("falls back to safe defaults for nullable address parts", () => {
    // Null overrides simulate legacy or partially backfilled rows.
    const supplier = toDomainSupplier({
      ...baseRow,
      billingAddressLine1: null,
      billingCity: null,
      billingState: null,
      billingPinCode: null,
      billingCountry: null as unknown as string,
      shippingCountry: null,
      gstin: null,
      pan: null,
    });

    expect(supplier.billingAddress.addressLine1).toBe("");
    expect(supplier.billingAddress.country).toBe("India");
    expect(supplier.shippingAddress.country).toBe("India");
    expect(supplier.gstin).toBeNull();
  });
});
