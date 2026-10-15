import { describe, expect, it } from "vitest";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  recordReceivingSchema,
} from "./purchase-order-schemas";

describe("purchase-order schemas", () => {
  it("accepts a minimal valid creation payload", () => {
    const result = createPurchaseOrderSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      items: [{ item: "Steel Rods", quantity: 10, unitPrice: 500 }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("Draft");
      expect(result.data.taxMode).toBe("CGST_SGST");
      expect(result.data.items[0].discount).toBe(0);
      expect(result.data.items[0].taxRate).toBe(18);
    }
  });

  it("rejects empty supplier names, bad dates, and empty item lists", () => {
    const result = createPurchaseOrderSchema.safeParse({
      supplierName: "",
      orderDate: "not-a-date",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects forged terminal statuses on create", () => {
    for (const status of ["Received", "PartiallyReceived", "Cancelled"]) {
      const result = createPurchaseOrderSchema.safeParse({
        supplierName: "Shree Balaji Traders",
        orderDate: "2026-10-14",
        status,
        items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
      });

      expect(result.success).toBe(false);
    }
  });

  it("accepts Draft and Confirmed initial statuses on create", () => {
    for (const status of ["Draft", "Confirmed"]) {
      const result = createPurchaseOrderSchema.safeParse({
        supplierName: "Shree Balaji Traders",
        orderDate: "2026-10-14",
        status,
        items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
      });

      expect(result.success).toBe(true);
    }
  });

  it("rejects non-positive quantities and out-of-range rates", () => {
    const badQuantity = createPurchaseOrderSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      items: [{ item: "Steel Rods", quantity: 0, unitPrice: 100 }],
    });
    expect(badQuantity.success).toBe(false);

    const badDiscount = createPurchaseOrderSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      orderDate: "2026-10-14",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100, discount: 150 }],
    });
    expect(badDiscount.success).toBe(false);
  });

  it("requires at least one field for updates", () => {
    expect(updatePurchaseOrderSchema.safeParse({}).success).toBe(false);
    expect(
      updatePurchaseOrderSchema.safeParse({ supplierName: "New Name" }).success,
    ).toBe(true);
  });

  it("validates receiving input quantities", () => {
    expect(
      recordReceivingSchema.safeParse({
        items: [{ id: "line-1", receivedQuantity: 5 }],
      }).success,
    ).toBe(true);
    expect(
      recordReceivingSchema.safeParse({
        items: [{ id: "line-1", receivedQuantity: -1 }],
      }).success,
    ).toBe(false);
    expect(recordReceivingSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
