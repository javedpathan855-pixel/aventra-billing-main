import { describe, expect, it } from "vitest";
import {
  canTransitionPurchaseBillStatus,
  validatePurchaseBillStatusTransition,
  canEditPurchaseBill,
  canDeletePurchaseBill,
  canConfirmPurchaseBill,
  canCancelPurchaseBill,
} from "./purchase-bill-lifecycle-rules";
import { InvalidPurchaseBillStatusTransitionError } from "../errors/purchase-bill-errors";

describe("purchase-bill lifecycle transitions and guards", () => {
  it("allows valid lifecycle transitions", () => {
    expect(canTransitionPurchaseBillStatus("Draft", "Confirmed")).toBe(true);
    expect(canTransitionPurchaseBillStatus("Draft", "Cancelled")).toBe(true);
    expect(canTransitionPurchaseBillStatus("Confirmed", "Cancelled")).toBe(true);
  });

  it("rejects invalid lifecycle transitions", () => {
    expect(canTransitionPurchaseBillStatus("Confirmed", "Draft")).toBe(false);
    expect(canTransitionPurchaseBillStatus("Cancelled", "Draft")).toBe(false);
    expect(canTransitionPurchaseBillStatus("Cancelled", "Confirmed")).toBe(false);
    expect(canTransitionPurchaseBillStatus("Draft", "Draft")).toBe(true);

    expect(() =>
      validatePurchaseBillStatusTransition("Confirmed", "Draft"),
    ).toThrow(InvalidPurchaseBillStatusTransitionError);

    expect(() =>
      validatePurchaseBillStatusTransition("Cancelled", "Confirmed"),
    ).toThrow(InvalidPurchaseBillStatusTransitionError);
  });

  it("enforces edit guard strictly for Draft bills only", () => {
    expect(canEditPurchaseBill({ status: "Draft" })).toBe(true);
    expect(canEditPurchaseBill({ status: "Confirmed" })).toBe(false);
    expect(canEditPurchaseBill({ status: "Cancelled" })).toBe(false);
  });

  it("enforces delete guard strictly for Draft bills only", () => {
    expect(canDeletePurchaseBill({ status: "Draft" })).toBe(true);
    expect(canDeletePurchaseBill({ status: "Confirmed" })).toBe(false);
    expect(canDeletePurchaseBill({ status: "Cancelled" })).toBe(false);
  });

  it("enforces confirm guard strictly for Draft bills only", () => {
    expect(canConfirmPurchaseBill({ status: "Draft" })).toBe(true);
    expect(canConfirmPurchaseBill({ status: "Confirmed" })).toBe(false);
    expect(canConfirmPurchaseBill({ status: "Cancelled" })).toBe(false);
  });

  it("enforces cancellation guard for non-terminal bills only", () => {
    expect(canCancelPurchaseBill({ status: "Draft" })).toBe(true);
    expect(canCancelPurchaseBill({ status: "Confirmed" })).toBe(true);
    expect(canCancelPurchaseBill({ status: "Cancelled" })).toBe(false);
  });
});
