import { describe, expect, it } from "vitest";
import {
  canTransitionSalesOrderStatus,
  validateSalesOrderStatusTransition,
  canEditSalesOrder,
  canDeleteSalesOrder,
  canConfirmSalesOrder,
  canRecordFulfilment,
  canConvertToInvoice,
  canCancelSalesOrder,
} from "./sales-order-lifecycle-rules";
import { InvalidSalesOrderStatusTransitionError } from "../errors/sales-order-errors";

describe("sales-order lifecycle transitions and guards", () => {
  it("allows valid lifecycle transitions", () => {
    expect(canTransitionSalesOrderStatus("Draft", "Confirmed")).toBe(true);
    expect(canTransitionSalesOrderStatus("Draft", "Cancelled")).toBe(true);
    expect(canTransitionSalesOrderStatus("Confirmed", "PartiallyFulfilled")).toBe(
      true,
    );
    expect(canTransitionSalesOrderStatus("Confirmed", "Fulfilled")).toBe(true);
    expect(canTransitionSalesOrderStatus("Confirmed", "Cancelled")).toBe(true);
    expect(
      canTransitionSalesOrderStatus("PartiallyFulfilled", "Fulfilled"),
    ).toBe(true);
    expect(
      canTransitionSalesOrderStatus("PartiallyFulfilled", "Cancelled"),
    ).toBe(true);
  });

  it("rejects invalid lifecycle transitions", () => {
    expect(canTransitionSalesOrderStatus("Draft", "Fulfilled")).toBe(false);
    expect(canTransitionSalesOrderStatus("Fulfilled", "Draft")).toBe(false);
    expect(canTransitionSalesOrderStatus("Fulfilled", "Confirmed")).toBe(false);
    expect(canTransitionSalesOrderStatus("Cancelled", "Confirmed")).toBe(false);
    expect(canTransitionSalesOrderStatus("Cancelled", "Draft")).toBe(false);

    expect(() =>
      validateSalesOrderStatusTransition("Fulfilled", "Draft"),
    ).toThrow(InvalidSalesOrderStatusTransitionError);

    expect(() =>
      validateSalesOrderStatusTransition("Cancelled", "Confirmed"),
    ).toThrow(InvalidSalesOrderStatusTransitionError);
  });

  it("enforces edit guard strictly for Draft orders only", () => {
    expect(canEditSalesOrder({ status: "Draft" })).toBe(true);
    expect(canEditSalesOrder({ status: "Confirmed" })).toBe(false);
    expect(canEditSalesOrder({ status: "PartiallyFulfilled" })).toBe(false);
    expect(canEditSalesOrder({ status: "Fulfilled" })).toBe(false);
    expect(canEditSalesOrder({ status: "Cancelled" })).toBe(false);
  });

  it("enforces delete guard strictly for Draft orders only", () => {
    expect(canDeleteSalesOrder({ status: "Draft" })).toBe(true);
    expect(canDeleteSalesOrder({ status: "Confirmed" })).toBe(false);
    expect(canDeleteSalesOrder({ status: "Fulfilled" })).toBe(false);
    expect(canDeleteSalesOrder({ status: "Cancelled" })).toBe(false);
  });

  it("enforces confirm guard strictly for Draft orders only", () => {
    expect(canConfirmSalesOrder({ status: "Draft" })).toBe(true);
    expect(canConfirmSalesOrder({ status: "Confirmed" })).toBe(false);
    expect(canConfirmSalesOrder({ status: "Cancelled" })).toBe(false);
  });

  it("enforces fulfilment recording guard", () => {
    expect(canRecordFulfilment({ status: "Confirmed" })).toBe(true);
    expect(canRecordFulfilment({ status: "PartiallyFulfilled" })).toBe(true);
    expect(canRecordFulfilment({ status: "Draft" })).toBe(false);
    expect(canRecordFulfilment({ status: "Fulfilled" })).toBe(false);
    expect(canRecordFulfilment({ status: "Cancelled" })).toBe(false);
  });

  it("enforces invoice conversion guard (only Confirmed, PartiallyFulfilled, Fulfilled)", () => {
    expect(canConvertToInvoice({ status: "Confirmed" })).toBe(true);
    expect(canConvertToInvoice({ status: "PartiallyFulfilled" })).toBe(true);
    expect(canConvertToInvoice({ status: "Fulfilled" })).toBe(true);
    expect(canConvertToInvoice({ status: "Draft" })).toBe(false);
    expect(canConvertToInvoice({ status: "Cancelled" })).toBe(false);
  });

  it("enforces cancellation guard", () => {
    expect(canCancelSalesOrder({ status: "Draft" })).toBe(true);
    expect(canCancelSalesOrder({ status: "Confirmed" })).toBe(true);
    expect(canCancelSalesOrder({ status: "PartiallyFulfilled" })).toBe(true);
    expect(canCancelSalesOrder({ status: "Fulfilled" })).toBe(false);
    expect(canCancelSalesOrder({ status: "Cancelled" })).toBe(false);
  });
});
