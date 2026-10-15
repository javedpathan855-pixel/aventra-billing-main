import { describe, expect, it } from "vitest";
import {
  createSalesReturnSchema,
  updateSalesReturnStatusSchema,
} from "./sales-return-schemas";

const validInput = {
  customerName: "Acme Corp",
  returnDate: "2026-10-14",
  reason: "Damaged in transit",
  items: [
    {
      item: "Widgets",
      soldQuantity: 10,
      returnQuantity: 2,
      unitPrice: 100,
    },
  ],
};

describe("sales-return schemas", () => {
  it("accepts a valid sales return payload", () => {
    const result = createSalesReturnSchema.safeParse(validInput);

    expect(result.success).toBe(true);
  });

  it("rejects an unsupported tax mode", () => {
    const result = createSalesReturnSchema.safeParse({
      ...validInput,
      taxMode: "VAT",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a malformed return date", () => {
    const result = createSalesReturnSchema.safeParse({
      ...validInput,
      returnDate: "14-10-2026",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a negative received quantity on status update", () => {
    const result = updateSalesReturnStatusSchema.safeParse({
      status: "APPROVED",
      receivedQuantities: { "item-1": -1 },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty return without line items", () => {
    const result = createSalesReturnSchema.safeParse({
      ...validInput,
      items: [],
    });

    expect(result.success).toBe(false);
  });
});
