import { describe, expect, it } from "vitest";
import {
  canAcceptEstimate,
  canCancelEstimate,
  canConvertToInvoice,
  canDeleteEstimate,
  canEditEstimate,
  canRejectEstimate,
  canReopenEstimate,
  canSendEstimate,
} from "./estimate-lifecycle-rules";
import type { Estimate } from "../entities/estimate";

describe("estimate lifecycle rules", () => {
  const makeEstimate = (
    status: Estimate["status"],
    convertedToInvoiceId?: string,
  ): Pick<Estimate, "status" | "convertedToInvoiceId"> => ({
    status,
    convertedToInvoiceId,
  });

  it("permits editing only for Draft status", () => {
    expect(canEditEstimate(makeEstimate("Draft"))).toBe(true);
    expect(canEditEstimate(makeEstimate("Sent"))).toBe(false);
    expect(canEditEstimate(makeEstimate("Accepted"))).toBe(false);
    expect(canEditEstimate(makeEstimate("Converted"))).toBe(false);
    expect(canEditEstimate(makeEstimate("Rejected"))).toBe(false);
    expect(canEditEstimate(makeEstimate("Cancelled"))).toBe(false);
    expect(canEditEstimate(makeEstimate("Expired"))).toBe(false);
  });

  it("permits sending only from Draft status", () => {
    expect(canSendEstimate(makeEstimate("Draft"))).toBe(true);
    expect(canSendEstimate(makeEstimate("Sent"))).toBe(false);
    expect(canSendEstimate(makeEstimate("Accepted"))).toBe(false);
    expect(canSendEstimate(makeEstimate("Converted"))).toBe(false);
  });

  it("permits accepting only from Sent status", () => {
    expect(canAcceptEstimate(makeEstimate("Sent"))).toBe(true);
    expect(canAcceptEstimate(makeEstimate("Draft"))).toBe(false);
    expect(canAcceptEstimate(makeEstimate("Accepted"))).toBe(false);
    expect(canAcceptEstimate(makeEstimate("Converted"))).toBe(false);
    expect(canAcceptEstimate(makeEstimate("Rejected"))).toBe(false);
  });

  it("permits rejecting only from Sent status", () => {
    expect(canRejectEstimate(makeEstimate("Sent"))).toBe(true);
    expect(canRejectEstimate(makeEstimate("Draft"))).toBe(false);
    expect(canRejectEstimate(makeEstimate("Accepted"))).toBe(false);
    expect(canRejectEstimate(makeEstimate("Converted"))).toBe(false);
  });

  it("permits cancellation for Draft and Sent statuses", () => {
    expect(canCancelEstimate(makeEstimate("Draft"))).toBe(true);
    expect(canCancelEstimate(makeEstimate("Sent"))).toBe(true);
    expect(canCancelEstimate(makeEstimate("Converted"))).toBe(false);
    expect(canCancelEstimate(makeEstimate("Cancelled"))).toBe(false);
  });

  it("permits converting to invoice only for eligible quotations", () => {
    // Accepted quotation with no previous conversion is eligible
    expect(canConvertToInvoice(makeEstimate("Accepted"))).toBe(true);
    // Sent quotation can also be converted directly
    expect(canConvertToInvoice(makeEstimate("Sent"))).toBe(true);

    // Already converted quotation CANNOT be converted again
    expect(canConvertToInvoice(makeEstimate("Accepted", "inv_123"))).toBe(false);
    expect(canConvertToInvoice(makeEstimate("Converted", "inv_123"))).toBe(false);
    expect(canConvertToInvoice(makeEstimate("Converted"))).toBe(false);

    // Rejected, Cancelled, Expired cannot be converted
    expect(canConvertToInvoice(makeEstimate("Rejected"))).toBe(false);
    expect(canConvertToInvoice(makeEstimate("Cancelled"))).toBe(false);
    expect(canConvertToInvoice(makeEstimate("Draft"))).toBe(false);
  });

  it("permits deleting only Draft estimates", () => {
    expect(canDeleteEstimate(makeEstimate("Draft"))).toBe(true);
    expect(canDeleteEstimate(makeEstimate("Sent"))).toBe(false);
    expect(canDeleteEstimate(makeEstimate("Accepted"))).toBe(false);
    expect(canDeleteEstimate(makeEstimate("Converted"))).toBe(false);
  });

  it("permits reopening terminal non-converted estimates back to Draft", () => {
    expect(canReopenEstimate(makeEstimate("Rejected"))).toBe(true);
    expect(canReopenEstimate(makeEstimate("Cancelled"))).toBe(true);
    expect(canReopenEstimate(makeEstimate("Expired"))).toBe(true);
    expect(canReopenEstimate(makeEstimate("Converted"))).toBe(false);
    expect(canReopenEstimate(makeEstimate("Accepted"))).toBe(false);
  });
});
