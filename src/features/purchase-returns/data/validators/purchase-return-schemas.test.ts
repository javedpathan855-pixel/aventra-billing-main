import { describe, expect, it } from "vitest";
import {
  createPurchaseReturnSchema,
  updatePurchaseReturnStatusSchema,
} from "./purchase-return-schemas";

const line = {
  item: "Steel Rods",
  billedQuantity: 10,
  returnQuantity: 4,
  unitPrice: 100,
};

describe("purchase-return schemas", () => {
  it("accepts a minimal valid creation payload", () => {
    const result = createPurchaseReturnSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      returnDate: "2026-10-14",
      reason: "Defective or damaged in transit",
      items: [line],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxMode).toBe("CGST_SGST");
      expect(result.data.items[0].disposition).toBe("RESTOCK");
      expect(result.data.items[0].taxRate).toBe(18);
    }
  });

  it("rejects missing supplier, reason, dates, and empty items", () => {
    const result = createPurchaseReturnSchema.safeParse({
      supplierName: "",
      returnDate: "not-a-date",
      reason: "",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-positive return quantities", () => {
    const result = createPurchaseReturnSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      returnDate: "2026-10-14",
      reason: "Damaged",
      items: [{ ...line, returnQuantity: 0 }],
    });

    expect(result.success).toBe(false);
  });

  it("accepts bill and order links with disposition and line reason", () => {
    const result = createPurchaseReturnSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      returnDate: "2026-10-14",
      reason: "Damaged",
      purchaseBillId: "pb-1",
      purchaseOrderId: "po-1",
      items: [
        {
          ...line,
          purchaseBillItemId: "pbi-1",
          disposition: "DAMAGED",
          reason: "Bent during transit",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("validates status transitions", () => {
    expect(
      updatePurchaseReturnStatusSchema.safeParse({ status: "APPROVED" }).success,
    ).toBe(true);
    expect(
      updatePurchaseReturnStatusSchema.safeParse({ status: "SHIPPED" }).success,
    ).toBe(false);
  });
});
