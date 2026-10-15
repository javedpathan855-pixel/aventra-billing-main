import { describe, expect, it } from "vitest";
import {
  createDebitNoteSchema,
  debitNoteLineItemSchema,
  updateDebitNoteSchema,
} from "./debit-note-schemas";

describe("debitNoteLineItemSchema", () => {
  it("validates a correct line item", () => {
    const result = debitNoteLineItemSchema.safeParse({
      item: "Additional service",
      quantity: 2,
      unitPrice: 5000,
      discount: 10,
      taxRate: 18,
    });
    expect(result.success).toBe(true);
  });

  it("coerces numeric strings from forms", () => {
    const result = debitNoteLineItemSchema.safeParse({
      item: "Service",
      quantity: "2",
      unitPrice: "1500.50",
      discount: "10",
      taxRate: "18",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(2);
      expect(result.data.unitPrice).toBe(1500.5);
    }
  });

  it("rejects non-finite values and invalid ranges", () => {
    expect(
      debitNoteLineItemSchema.safeParse({ item: "X", quantity: 1, unitPrice: Infinity }).success,
    ).toBe(false);
    expect(
      debitNoteLineItemSchema.safeParse({ item: "X", quantity: 0, unitPrice: 100 }).success,
    ).toBe(false);
    expect(
      debitNoteLineItemSchema.safeParse({ item: "X", quantity: 1, unitPrice: 100, discount: 101 })
        .success,
    ).toBe(false);
  });
});

describe("createDebitNoteSchema", () => {
  const baseValid = {
    invoiceId: "inv-123",
    issueDate: "2026-10-13",
    reason: "Under-billing correction",
    items: [{ item: "Item 1", quantity: 1, unitPrice: 100 }],
  };

  it("validates a correct payload with Draft default", () => {
    const result = createDebitNoteSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("Draft");
    }
  });

  it("requires an invoice reference and items", () => {
    expect(createDebitNoteSchema.safeParse({ ...baseValid, invoiceId: "" }).success).toBe(false);
    expect(createDebitNoteSchema.safeParse({ ...baseValid, items: [] }).success).toBe(false);
  });

  it("requires valid date format", () => {
    expect(
      createDebitNoteSchema.safeParse({ ...baseValid, issueDate: "13/10/2026" }).success,
    ).toBe(false);
  });

  it("rejects an overlong reason", () => {
    expect(
      createDebitNoteSchema.safeParse({ ...baseValid, reason: "x".repeat(501) }).success,
    ).toBe(false);
  });
});

describe("updateDebitNoteSchema", () => {
  it("requires id for update", () => {
    const result = updateDebitNoteSchema.safeParse({
      id: "",
      issueDate: "2026-10-13",
      reason: "Correction",
      items: [{ item: "Item 1", quantity: 1, unitPrice: 100 }],
    });
    expect(result.success).toBe(false);
  });
});
