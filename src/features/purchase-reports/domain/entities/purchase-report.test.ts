import { describe, expect, it } from "vitest";
import { calculateBillOutstanding } from "./purchase-report";

describe("purchase report calculations", () => {
  it("computes outstanding as total minus active allocations", () => {
    expect(calculateBillOutstanding(1180, 0)).toBe(1180);
    expect(calculateBillOutstanding(1180, 500)).toBe(680);
    expect(calculateBillOutstanding(1180, 1180)).toBe(0);
  });

  it("floors outstanding at zero on over-allocation", () => {
    expect(calculateBillOutstanding(100, 150)).toBe(0);
  });
});
