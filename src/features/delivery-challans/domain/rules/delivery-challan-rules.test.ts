import { describe, expect, it } from "vitest";
import {
  canTransitionStatus,
  assertValidStatusTransition,
  calculateRemainingDeliverableQuantity,
  assertDeliverableQuantity,
  deriveSalesOrderFulfilmentStatus,
} from "./delivery-challan-rules";
import {
  InvalidChallanStatusTransitionError,
  OverDeliveryError,
  DeliveryChallanDomainError,
} from "../errors/delivery-challan-errors";

describe("Delivery Challan Domain Rules", () => {
  describe("Status Transitions", () => {
    it("allows valid transitions from DRAFT", () => {
      expect(canTransitionStatus("DRAFT", "DISPATCHED")).toBe(true);
      expect(canTransitionStatus("DRAFT", "CANCELLED")).toBe(true);
      expect(canTransitionStatus("DRAFT", "DRAFT")).toBe(true);
      expect(canTransitionStatus("DRAFT", "DELIVERED")).toBe(false);
    });

    it("allows valid transitions from DISPATCHED", () => {
      expect(canTransitionStatus("DISPATCHED", "DELIVERED")).toBe(true);
      expect(canTransitionStatus("DISPATCHED", "CANCELLED")).toBe(true);
      expect(canTransitionStatus("DISPATCHED", "DRAFT")).toBe(false);
    });

    it("blocks transitions from terminal states DELIVERED and CANCELLED", () => {
      expect(canTransitionStatus("DELIVERED", "DRAFT")).toBe(false);
      expect(canTransitionStatus("DELIVERED", "CANCELLED")).toBe(false);
      expect(canTransitionStatus("CANCELLED", "DRAFT")).toBe(false);
      expect(canTransitionStatus("CANCELLED", "DELIVERED")).toBe(false);
    });

    it("assertValidStatusTransition throws on invalid transition", () => {
      expect(() => assertValidStatusTransition("DRAFT", "DELIVERED")).toThrow(
        InvalidChallanStatusTransitionError,
      );
      expect(() => assertValidStatusTransition("DELIVERED", "DRAFT")).toThrow(
        InvalidChallanStatusTransitionError,
      );
      expect(() => assertValidStatusTransition("DRAFT", "DISPATCHED")).not.toThrow();
    });
  });

  describe("Deliverable Quantity Calculations & Validation", () => {
    it("calculates remaining deliverable quantity accurately", () => {
      expect(calculateRemainingDeliverableQuantity(100, 30)).toBe(70);
      expect(calculateRemainingDeliverableQuantity(50, 50)).toBe(0);
      expect(calculateRemainingDeliverableQuantity(10, 15)).toBe(0);
    });

    it("validates delivered quantity within remaining bounds", () => {
      expect(() => assertDeliverableQuantity("Item A", 25, 30)).not.toThrow();
      expect(() => assertDeliverableQuantity("Item A", 30, 30)).not.toThrow();
    });

    it("rejects zero or negative delivery quantities", () => {
      expect(() => assertDeliverableQuantity("Item A", 0, 10)).toThrow(
        DeliveryChallanDomainError,
      );
      expect(() => assertDeliverableQuantity("Item A", -5, 10)).toThrow(
        DeliveryChallanDomainError,
      );
    });

    it("rejects over-delivery quantities exceeding remaining order", () => {
      expect(() => assertDeliverableQuantity("Item A", 35, 30)).toThrow(
        OverDeliveryError,
      );
    });
  });

  describe("Sales Order Fulfilment Status Derivation", () => {
    it("derives CONFIRMED when nothing has been delivered", () => {
      const lines = [
        { orderedQuantity: 10, cumulativeDeliveredQuantity: 0 },
        { orderedQuantity: 20, cumulativeDeliveredQuantity: 0 },
      ];
      expect(deriveSalesOrderFulfilmentStatus(lines)).toBe("CONFIRMED");
    });

    it("derives PARTIALLY_FULFILLED when some items delivered but not all", () => {
      const lines = [
        { orderedQuantity: 10, cumulativeDeliveredQuantity: 10 },
        { orderedQuantity: 20, cumulativeDeliveredQuantity: 5 },
      ];
      expect(deriveSalesOrderFulfilmentStatus(lines)).toBe("PARTIALLY_FULFILLED");
    });

    it("derives FULFILLED when all items have been fully delivered", () => {
      const lines = [
        { orderedQuantity: 10, cumulativeDeliveredQuantity: 10 },
        { orderedQuantity: 20, cumulativeDeliveredQuantity: 20 },
      ];
      expect(deriveSalesOrderFulfilmentStatus(lines)).toBe("FULFILLED");
    });
  });
});
