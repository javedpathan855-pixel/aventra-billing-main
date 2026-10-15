import { describe, expect, it } from "vitest";
import {
  createSalesOrderSchema,
  updateSalesOrderSchema,
} from "./sales-order-schemas";

describe("sales-order schemas", () => {
  it("accepts a valid sales order payload", () => {
    const result = createSalesOrderSchema.safeParse({
      customerName: "Acme Corp",
      orderDate: "2026-10-14",
      items: [{ item: "Widgets", quantity: 10, unitPrice: 100 }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty update payload", () => {
    const result = updateSalesOrderSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("accepts a partial update with at least one field", () => {
    const result = updateSalesOrderSchema.safeParse({
      customerName: "Acme Global",
    });

    expect(result.success).toBe(true);
  });
});
