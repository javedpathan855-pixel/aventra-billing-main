import { describe, expect, it } from "vitest";
import {
  canTransitionPurchaseOrderStatus,
  validatePurchaseOrderStatusTransition,
  canEditPurchaseOrder,
  canDeletePurchaseOrder,
  canConfirmPurchaseOrder,
  canRecordReceiving,
  canCancelPurchaseOrder,
} from "./purchase-order-lifecycle-rules";
import { InvalidPurchaseOrderStatusTransitionError } from "../errors/purchase-order-errors";

describe("purchase-order lifecycle transitions and guards", () => {
  it("allows valid lifecycle transitions", () => {
    expect(canTransitionPurchaseOrderStatus("Draft", "Confirmed")).toBe(true);
    expect(canTransitionPurchaseOrderStatus("Draft", "Cancelled")).toBe(true);
    expect(
      canTransitionPurchaseOrderStatus("Confirmed", "PartiallyReceived"),
    ).toBe(true);
    expect(canTransitionPurchaseOrderStatus("Confirmed", "Received")).toBe(true);
    expect(canTransitionPurchaseOrderStatus("Confirmed", "Cancelled")).toBe(true);
    expect(canTransitionPurchaseOrderStatus("PartiallyReceived", "Received")).toBe(
      true,
    );
    expect(
      canTransitionPurchaseOrderStatus("PartiallyReceived", "Cancelled"),
    ).toBe(true);
  });

  it("rejects invalid lifecycle transitions", () => {
    expect(canTransitionPurchaseOrderStatus("Draft", "Received")).toBe(false);
    expect(canTransitionPurchaseOrderStatus("Draft", "PartiallyReceived")).toBe(
      false,
    );
    expect(canTransitionPurchaseOrderStatus("Received", "Draft")).toBe(false);
    expect(canTransitionPurchaseOrderStatus("Received", "Confirmed")).toBe(false);
    expect(canTransitionPurchaseOrderStatus("Cancelled", "Confirmed")).toBe(false);
    expect(canTransitionPurchaseOrderStatus("Cancelled", "Draft")).toBe(false);

    expect(() =>
      validatePurchaseOrderStatusTransition("Received", "Draft"),
    ).toThrow(InvalidPurchaseOrderStatusTransitionError);

    expect(() =>
      validatePurchaseOrderStatusTransition("Cancelled", "Confirmed"),
    ).toThrow(InvalidPurchaseOrderStatusTransitionError);

    expect(() =>
      validatePurchaseOrderStatusTransition("Draft", "Received"),
    ).toThrow(InvalidPurchaseOrderStatusTransitionError);
  });

  it("enforces edit guard strictly for Draft orders only", () => {
    expect(canEditPurchaseOrder({ status: "Draft" })).toBe(true);
    expect(canEditPurchaseOrder({ status: "Confirmed" })).toBe(false);
    expect(canEditPurchaseOrder({ status: "PartiallyReceived" })).toBe(false);
    expect(canEditPurchaseOrder({ status: "Received" })).toBe(false);
    expect(canEditPurchaseOrder({ status: "Cancelled" })).toBe(false);
  });

  it("enforces delete guard strictly for Draft orders only", () => {
    expect(canDeletePurchaseOrder({ status: "Draft" })).toBe(true);
    expect(canDeletePurchaseOrder({ status: "Confirmed" })).toBe(false);
    expect(canDeletePurchaseOrder({ status: "Received" })).toBe(false);
    expect(canDeletePurchaseOrder({ status: "Cancelled" })).toBe(false);
  });

  it("enforces confirm guard strictly for Draft orders only", () => {
    expect(canConfirmPurchaseOrder({ status: "Draft" })).toBe(true);
    expect(canConfirmPurchaseOrder({ status: "Confirmed" })).toBe(false);
    expect(canConfirmPurchaseOrder({ status: "Cancelled" })).toBe(false);
  });

  it("enforces receiving guard (only Confirmed, PartiallyReceived)", () => {
    expect(canRecordReceiving({ status: "Confirmed" })).toBe(true);
    expect(canRecordReceiving({ status: "PartiallyReceived" })).toBe(true);
    expect(canRecordReceiving({ status: "Draft" })).toBe(false);
    expect(canRecordReceiving({ status: "Received" })).toBe(false);
    expect(canRecordReceiving({ status: "Cancelled" })).toBe(false);
  });

  it("enforces cancellation guard (active orders only)", () => {
    expect(canCancelPurchaseOrder({ status: "Draft" })).toBe(true);
    expect(canCancelPurchaseOrder({ status: "Confirmed" })).toBe(true);
    expect(canCancelPurchaseOrder({ status: "PartiallyReceived" })).toBe(true);
    expect(canCancelPurchaseOrder({ status: "Received" })).toBe(false);
    expect(canCancelPurchaseOrder({ status: "Cancelled" })).toBe(false);
  });
});
