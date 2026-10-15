import { describe, expect, it } from "vitest";
import {
  recordPaymentSchema,
  reversePaymentSchema,
} from "./payment-schemas";

const baseValid = {
  customerId: "cust-1",
  amount: 10000,
  paymentDate: "2026-10-15",
  method: "UPI",
  allocations: [{ invoiceId: "inv-1", amount: 10000 }],
};

describe("recordPaymentSchema", () => {
  it("validates a correct payload with method default", () => {
    const result = recordPaymentSchema.safeParse({
      customerId: "cust-1",
      amount: 10000,
      paymentDate: "2026-10-15",
      allocations: [{ invoiceId: "inv-1", amount: 10000 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.method).toBe("Other");
    }
  });

  it("rejects missing customers, empty allocations, and bad amounts", () => {
    expect(
      recordPaymentSchema.safeParse({ ...baseValid, customerId: "" }).success,
    ).toBe(false);
    expect(
      recordPaymentSchema.safeParse({ ...baseValid, allocations: [] }).success,
    ).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...baseValid, amount: 0 }).success).toBe(false);
    expect(
      recordPaymentSchema.safeParse({ ...baseValid, amount: Number.POSITIVE_INFINITY }).success,
    ).toBe(false);
  });

  it("rejects malformed dates and overlong references", () => {
    expect(
      recordPaymentSchema.safeParse({ ...baseValid, paymentDate: "15/10/2026" }).success,
    ).toBe(false);
    expect(
      recordPaymentSchema.safeParse({ ...baseValid, reference: "x".repeat(101) }).success,
    ).toBe(false);
  });
});

describe("reversePaymentSchema", () => {
  it("requires an id and caps the reason", () => {
    expect(reversePaymentSchema.safeParse({ id: "" }).success).toBe(false);
    expect(reversePaymentSchema.safeParse({ id: "pay-1" }).success).toBe(true);
    expect(
      reversePaymentSchema.safeParse({ id: "pay-1", reason: "x".repeat(501) }).success,
    ).toBe(false);
  });
});
