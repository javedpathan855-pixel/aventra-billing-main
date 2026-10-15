import { describe, expect, it } from "vitest";
import { getCronSecret, isAuthorizedCronRequest } from "./cron-auth";

describe("cron endpoint authentication", () => {
  it("accepts a matching bearer token", () => {
    process.env.CRON_SECRET = "test-secret-that-is-long-enough-12345";
    expect(isAuthorizedCronRequest("Bearer test-secret-that-is-long-enough-12345")).toBe(true);
  });

  it("rejects missing, malformed, and wrong credentials", () => {
    process.env.CRON_SECRET = "test-secret-that-is-long-enough-12345";
    expect(isAuthorizedCronRequest(null)).toBe(false);
    expect(isAuthorizedCronRequest("Basic abc")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer wrong-secret-that-is-long-enough!")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer short")).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest("Bearer anything-at-all-here-ok")).toBe(false);
    expect(() => getCronSecret()).toThrow();
  });

  it("rejects short secrets", () => {
    process.env.CRON_SECRET = "too-short";
    expect(isAuthorizedCronRequest("Bearer too-short")).toBe(false);
    delete process.env.CRON_SECRET;
  });
});
