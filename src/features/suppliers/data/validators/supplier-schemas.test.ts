import { describe, expect, it } from "vitest";
import {
  createSupplierSchema,
  updateSupplierSchema,
  updateSupplierStatusSchema,
  supplierFilterSchema,
} from "./supplier-schemas";

const validAddress = {
  addressLine1: "14 MG Road",
  city: "Pune",
  state: "Maharashtra",
  pinCode: "411001",
  country: "India",
};

const validCreate = {
  name: "Shree Balaji Traders",
  billingAddress: validAddress,
};

describe("supplier schemas", () => {
  it("accepts a minimal valid supplier payload with defaults", () => {
    const result = createSupplierSchema.safeParse({
      ...validCreate,
      gstTreatment: "CONSUMER_UNREGISTERED",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("ACTIVE");
      expect(result.data.currency).toBe("INR (₹)");
      expect(result.data.sameAsBillingAddress).toBe(true);
    }
  });

  it("rejects a missing name and invalid email", () => {
    const result = createSupplierSchema.safeParse({
      ...validCreate,
      name: "A",
      email: "not-an-email",
      gstTreatment: "CONSUMER_UNREGISTERED",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toContain("name");
      expect(paths).toContain("email");
    }
  });

  it("requires GSTIN for registered treatments and validates its format", () => {
    const missing = createSupplierSchema.safeParse({
      ...validCreate,
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
    });
    expect(missing.success).toBe(false);

    const malformed = createSupplierSchema.safeParse({
      ...validCreate,
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: "BOGUS",
    });
    expect(malformed.success).toBe(false);

    const valid = createSupplierSchema.safeParse({
      ...validCreate,
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: "27AABCS1234F1Z5",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects a PAN that does not match the GSTIN", () => {
    const result = createSupplierSchema.safeParse({
      ...validCreate,
      gstTreatment: "REGISTERED_BUSINESS_REGULAR",
      gstin: "27AABCS1234F1Z5",
      pan: "BBBBB1111B",
    });

    expect(result.success).toBe(false);
  });

  it("accepts sparse update patches without materializing defaults", () => {
    const result = updateSupplierSchema.safeParse({ name: "Renamed Supplier" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
      expect(result.data.currency).toBeUndefined();
    }
  });

  it("validates status transitions payloads and clamps filter pagination", () => {
    expect(
      updateSupplierStatusSchema.safeParse({ status: "INACTIVE" }).success,
    ).toBe(true);
    expect(updateSupplierStatusSchema.safeParse({ status: "ARCHIVED" }).success).toBe(
      false,
    );

    const filter = supplierFilterSchema.safeParse({ page: 0, pageSize: 500 });
    expect(filter.success).toBe(false);

    const defaulted = supplierFilterSchema.safeParse({});
    expect(defaulted.success).toBe(true);
    if (defaulted.success) {
      expect(defaulted.data.page).toBe(1);
      expect(defaulted.data.pageSize).toBe(8);
      expect(defaulted.data.status).toBe("ALL");
    }
  });

  it("allows GSTIN-less sparse patches on update for merged-record checks", () => {
    // Sparse updates skip cross-field tax refines; the mutation validates the
    // merged (existing + patch) record instead.
    const result = updateSupplierSchema.safeParse({ phone: "+91 98220 00000" });

    expect(result.success).toBe(true);
  });
});
