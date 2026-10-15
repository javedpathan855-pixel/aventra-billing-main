import { describe, expect, it } from "vitest";
import {
  createPurchaseBillSchema,
  updatePurchaseBillSchema,
} from "./purchase-bill-schemas";

describe("purchase-bill schemas", () => {
  it("accepts a minimal valid creation payload", () => {
    const result = createPurchaseBillSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
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
    const result = createPurchaseBillSchema.safeParse({
      supplierName: "",
      billDate: "not-a-date",
      dueDate: "2026-11-13",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a due date before the bill date", () => {
    const result = createPurchaseBillSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      billDate: "2026-10-14",
      dueDate: "2026-10-01",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path.join(".") === "dueDate"),
      ).toBe(true);
    }
  });

  it("rejects forged terminal statuses on create", () => {
    const result = createPurchaseBillSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      status: "Cancelled",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(false);
  });

  it("accepts Draft and Confirmed initial statuses on create", () => {
    for (const status of ["Draft", "Confirmed"]) {
      const result = createPurchaseBillSchema.safeParse({
        supplierName: "Shree Balaji Traders",
        billDate: "2026-10-14",
        dueDate: "2026-11-13",
        status,
        items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
      });

      expect(result.success).toBe(true);
    }
  });

  it("rejects non-positive quantities and out-of-range rates", () => {
    const badQuantity = createPurchaseBillSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [{ item: "Steel Rods", quantity: 0, unitPrice: 100 }],
    });
    expect(badQuantity.success).toBe(false);

    const badDiscount = createPurchaseBillSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100, discount: 150 }],
    });
    expect(badDiscount.success).toBe(false);
  });

  it("accepts optional supplier invoice and purchase order references", () => {
    const result = createPurchaseBillSchema.safeParse({
      supplierName: "Shree Balaji Traders",
      billDate: "2026-10-14",
      dueDate: "2026-11-13",
      supplierInvoiceNumber: "INV-2026-118",
      supplierInvoiceDate: "2026-10-12",
      purchaseOrderId: "po-123",
      items: [{ item: "Steel Rods", quantity: 1, unitPrice: 100 }],
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one field for updates", () => {
    expect(updatePurchaseBillSchema.safeParse({}).success).toBe(false);
    expect(
      updatePurchaseBillSchema.safeParse({ supplierName: "New Name" }).success,
    ).toBe(true);
  });
});
