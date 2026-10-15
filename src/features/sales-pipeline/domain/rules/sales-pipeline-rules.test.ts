import { describe, expect, it } from "vitest";
import {
  calculateWeightedOpportunityValue,
  validateProbability,
  assertLossReasonWhenLost,
  isOpportunityOverdue,
  calculatePipelineMetrics,
  STAGE_DEFAULT_PROBABILITIES,
  ALLOWED_STAGE_TRANSITIONS,
  canTransitionOpportunityStage,
  validateOpportunityStageTransition,
} from "./sales-pipeline-rules";
import {
  InvalidOpportunityStageTransitionError,
  MandatoryLossReasonError,
  SalesPipelineDomainError,
} from "../errors/sales-pipeline-errors";
import type { SalesOpportunity } from "../entities/sales-opportunity";

describe("Sales Pipeline Domain Rules", () => {
  describe("Weighted Value Calculation", () => {
    it("calculates weighted value based on probability percentage", () => {
      expect(calculateWeightedOpportunityValue(100000, 50)).toBe(50000);
      expect(calculateWeightedOpportunityValue(250000, 10)).toBe(25000);
      expect(calculateWeightedOpportunityValue(150000, 100)).toBe(150000);
      expect(calculateWeightedOpportunityValue(75000, 0)).toBe(0);
    });

    it("clamps negative estimated values to 0", () => {
      expect(calculateWeightedOpportunityValue(-500, 50)).toBe(0);
    });
  });

  describe("Probability Validation", () => {
    it("accepts valid probabilities between 0 and 100", () => {
      expect(() => validateProbability(0)).not.toThrow();
      expect(() => validateProbability(50)).not.toThrow();
      expect(() => validateProbability(100)).not.toThrow();
    });

    it("rejects probabilities out of bounds or non-numbers", () => {
      expect(() => validateProbability(-1)).toThrow(SalesPipelineDomainError);
      expect(() => validateProbability(101)).toThrow(SalesPipelineDomainError);
      expect(() => validateProbability(NaN)).toThrow(SalesPipelineDomainError);
    });

    it("verifies standard stage default probabilities", () => {
      expect(STAGE_DEFAULT_PROBABILITIES.NEW_LEAD).toBe(10);
      expect(STAGE_DEFAULT_PROBABILITIES.QUALIFIED).toBe(30);
      expect(STAGE_DEFAULT_PROBABILITIES.PROPOSAL).toBe(60);
      expect(STAGE_DEFAULT_PROBABILITIES.NEGOTIATION).toBe(80);
      expect(STAGE_DEFAULT_PROBABILITIES.WON).toBe(100);
      expect(STAGE_DEFAULT_PROBABILITIES.LOST).toBe(0);
    });
  });

  describe("Loss Reason Enforcement", () => {
    it("enforces non-empty loss reason when stage is LOST", () => {
      expect(() => assertLossReasonWhenLost("LOST", "")).toThrow(
        MandatoryLossReasonError,
      );
      expect(() => assertLossReasonWhenLost("LOST", "   ")).toThrow(
        MandatoryLossReasonError,
      );
      expect(() => assertLossReasonWhenLost("LOST", null)).toThrow(
        MandatoryLossReasonError,
      );
      expect(() =>
        assertLossReasonWhenLost("LOST", "Competitor undercut price"),
      ).not.toThrow();
    });

    it("does not require loss reason for other stages", () => {
      expect(() => assertLossReasonWhenLost("NEW_LEAD", null)).not.toThrow();
      expect(() => assertLossReasonWhenLost("PROPOSAL", null)).not.toThrow();
      expect(() => assertLossReasonWhenLost("WON", null)).not.toThrow();
    });
  });

  describe("Overdue Follow-Up Detection", () => {
    const referenceDate = new Date("2026-10-14T12:00:00Z");

    it("flags past dates as overdue for active opportunities", () => {
      const past = new Date("2026-10-10T10:00:00Z");
      expect(isOpportunityOverdue(past, "NEW_LEAD", referenceDate)).toBe(true);
      expect(isOpportunityOverdue(past, "PROPOSAL", referenceDate)).toBe(true);
    });

    it("does not flag future dates or null follow-ups as overdue", () => {
      const future = new Date("2026-10-20T10:00:00Z");
      expect(isOpportunityOverdue(future, "QUALIFIED", referenceDate)).toBe(false);
      expect(isOpportunityOverdue(null, "QUALIFIED", referenceDate)).toBe(false);
      expect(isOpportunityOverdue(undefined, "QUALIFIED", referenceDate)).toBe(false);
    });

    it("never flags closed opportunities (WON or LOST) as overdue", () => {
      const past = new Date("2026-10-01T10:00:00Z");
      expect(isOpportunityOverdue(past, "WON", referenceDate)).toBe(false);
      expect(isOpportunityOverdue(past, "LOST", referenceDate)).toBe(false);
    });
  });

  describe("Pipeline Metrics Calculation", () => {
    const referenceDate = new Date("2026-10-14T12:00:00Z");

    const mockOpps: SalesOpportunity[] = [
      {
        id: "1",
        organizationId: "org-1",
        title: "Deal 1",
        customerId: null,
        customerName: "Acme",
        customerEmail: null,
        customerPhone: null,
        contactPerson: null,
        description: null,
        source: "Website",
        stage: "NEW_LEAD",
        estimatedValue: 100000,
        currency: "INR (₹)",
        probability: 10,
        weightedValue: 10000,
        expectedCloseDate: null,
        assignedTo: null,
        nextFollowUpDate: new Date("2026-10-10T00:00:00Z"), // Overdue
        nextAction: null,
        lossReason: null,
        estimateId: null,
        estimateNumber: null,
        salesOrderId: null,
        salesOrderNumber: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        organizationId: "org-1",
        title: "Deal 2",
        customerId: null,
        customerName: "Beta Corp",
        customerEmail: null,
        customerPhone: null,
        contactPerson: null,
        description: null,
        source: "Referral",
        stage: "PROPOSAL",
        estimatedValue: 200000,
        currency: "INR (₹)",
        probability: 60,
        weightedValue: 120000,
        expectedCloseDate: null,
        assignedTo: null,
        nextFollowUpDate: new Date("2026-10-25T00:00:00Z"), // Not overdue
        nextAction: null,
        lossReason: null,
        estimateId: null,
        estimateNumber: null,
        salesOrderId: null,
        salesOrderNumber: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "3",
        organizationId: "org-1",
        title: "Deal 3",
        customerId: null,
        customerName: "Gamma Ltd",
        customerEmail: null,
        customerPhone: null,
        contactPerson: null,
        description: null,
        source: "Website",
        stage: "WON",
        estimatedValue: 300000,
        currency: "INR (₹)",
        probability: 100,
        weightedValue: 300000,
        expectedCloseDate: null,
        assignedTo: null,
        nextFollowUpDate: null,
        nextAction: null,
        lossReason: null,
        estimateId: null,
        estimateNumber: null,
        salesOrderId: null,
        salesOrderNumber: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "4",
        organizationId: "org-1",
        title: "Deal 4",
        customerId: null,
        customerName: "Delta Inc",
        customerEmail: null,
        customerPhone: null,
        contactPerson: null,
        description: null,
        source: "Cold Call",
        stage: "LOST",
        estimatedValue: 50000,
        currency: "INR (₹)",
        probability: 0,
        weightedValue: 0,
        expectedCloseDate: null,
        assignedTo: null,
        nextFollowUpDate: null,
        nextAction: null,
        lossReason: "Budget slashed",
        estimateId: null,
        estimateNumber: null,
        salesOrderId: null,
        salesOrderNumber: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("computes pipeline active totals, weighted forecast, win rate, and overdue counts", () => {
      const metrics = calculatePipelineMetrics(mockOpps, referenceDate);

      // Active deals are Deal 1 and Deal 2:
      // Total pipeline value = 100,000 + 200,000 = 300,000
      expect(metrics.totalPipelineValue).toBe(300000);
      // Weighted = 10,000 + 120,000 = 130,000
      expect(metrics.weightedPipelineValue).toBe(130000);
      expect(metrics.openCount).toBe(2);
      expect(metrics.wonCount).toBe(1);
      expect(metrics.lostCount).toBe(1);
      // Win rate = 1 won / (1 won + 1 lost) = 50%
      expect(metrics.winRate).toBe(50);
      // Deal 1 is overdue
      expect(metrics.overdueFollowUpsCount).toBe(1);
      // Stage counts
      expect(metrics.stageCounts.NEW_LEAD).toBe(1);
      expect(metrics.stageCounts.PROPOSAL).toBe(1);
      expect(metrics.stageCounts.WON).toBe(1);
      expect(metrics.stageCounts.LOST).toBe(1);
    });
  });

  describe("Stage Transitions", () => {
    it("allows forward movement through open stages", () => {
      expect(canTransitionOpportunityStage("NEW_LEAD", "QUALIFIED")).toBe(true);
      expect(canTransitionOpportunityStage("QUALIFIED", "PROPOSAL")).toBe(true);
      expect(canTransitionOpportunityStage("PROPOSAL", "NEGOTIATION")).toBe(true);
      expect(canTransitionOpportunityStage("NEGOTIATION", "WON")).toBe(true);
    });

    it("allows stepping back and skipping open stages", () => {
      expect(canTransitionOpportunityStage("NEGOTIATION", "PROPOSAL")).toBe(true);
      expect(canTransitionOpportunityStage("PROPOSAL", "NEW_LEAD")).toBe(true);
      expect(canTransitionOpportunityStage("NEW_LEAD", "NEGOTIATION")).toBe(true);
    });

    it("allows closing from any open stage", () => {
      expect(canTransitionOpportunityStage("NEW_LEAD", "LOST")).toBe(true);
      expect(canTransitionOpportunityStage("QUALIFIED", "WON")).toBe(true);
      expect(canTransitionOpportunityStage("NEGOTIATION", "LOST")).toBe(true);
    });

    it("treats a same-stage update as a no-op", () => {
      expect(canTransitionOpportunityStage("WON", "WON")).toBe(true);
      expect(canTransitionOpportunityStage("LOST", "LOST")).toBe(true);
      expect(() =>
        validateOpportunityStageTransition("WON", "WON"),
      ).not.toThrow();
    });

    it("locks terminal stages against every outgoing transition", () => {
      const terminals = ["WON", "LOST"] as const;
      const all = Object.keys(ALLOWED_STAGE_TRANSITIONS) as Array<
        keyof typeof ALLOWED_STAGE_TRANSITIONS
      >;
      for (const from of terminals) {
        for (const to of all) {
          if (from !== to) {
            expect(canTransitionOpportunityStage(from, to)).toBe(false);
          }
        }
      }
      expect(() =>
        validateOpportunityStageTransition("LOST", "WON"),
      ).toThrow(InvalidOpportunityStageTransitionError);
      expect(() =>
        validateOpportunityStageTransition("WON", "QUALIFIED"),
      ).toThrow(InvalidOpportunityStageTransitionError);
      expect(() =>
        validateOpportunityStageTransition("LOST", "NEGOTIATION"),
      ).toThrow(InvalidOpportunityStageTransitionError);
    });
  });

  describe("Terminal Metrics Integrity", () => {
    it("counts each terminal opportunity exactly once", () => {
      const base = {
        organizationId: "org-1",
        title: "Deal",
        customerId: null,
        customerName: "Acme",
        customerEmail: null,
        customerPhone: null,
        contactPerson: null,
        description: null,
        source: "Website",
        estimatedValue: 50000,
        currency: "INR (₹)",
        probability: 100,
        expectedCloseDate: null,
        assignedTo: null,
        nextFollowUpDate: null,
        nextAction: null,
        lossReason: null,
        estimateId: null,
        estimateNumber: null,
        salesOrderId: null,
        salesOrderNumber: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const opps: SalesOpportunity[] = [
        { ...base, id: "1", stage: "WON", weightedValue: 50000 },
        {
          ...base,
          id: "2",
          stage: "LOST",
          probability: 0,
          weightedValue: 0,
          lossReason: "Price",
        },
        {
          ...base,
          id: "3",
          stage: "PROPOSAL",
          probability: 60,
          weightedValue: 30000,
        },
      ];
      const metrics = calculatePipelineMetrics(opps);

      expect(metrics.wonCount).toBe(1);
      expect(metrics.lostCount).toBe(1);
      expect(metrics.openCount).toBe(1);
      expect(metrics.wonCount + metrics.lostCount + metrics.openCount).toBe(
        opps.length,
      );
      expect(metrics.totalPipelineValue).toBe(50000);
    });
  });
});
