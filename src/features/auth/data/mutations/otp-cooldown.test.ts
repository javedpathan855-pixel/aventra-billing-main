import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  assertOtpSendCooldown,
  toOtpIdentifier,
} from "./otp-cooldown";

vi.mock("server-only", () => ({}));

const mockFindFirst = vi.fn();
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    verification: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
  }),
}));

/**
 * DEF-007 regression tests: OTP resend / password-reset requests are
 * throttled server-side with a DB-backed cooldown shared across instances.
 */
describe("OTP send cooldown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds Better Auth emailOTP identifiers", () => {
    expect(toOtpIdentifier("email-verification", "User@Example.com")).toBe(
      "email-verification-otp-user@example.com",
    );
    expect(toOtpIdentifier("forget-password", "User@Example.com")).toBe(
      "forget-password-otp-user@example.com",
    );
  });

  it("allows sending when no prior OTP record exists", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(assertOtpSendCooldown("email-verification-otp-a@x.com")).resolves.toBeUndefined();
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { identifier: "email-verification-otp-a@x.com" },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("rejects a resend within the cooldown window", async () => {
    mockFindFirst.mockResolvedValue({
      identifier: "email-verification-otp-a@x.com",
      updatedAt: new Date(Date.now() - 10 * 1000),
    });
    await expect(assertOtpSendCooldown("email-verification-otp-a@x.com")).rejects.toThrow(
      /Too many verification attempts/,
    );
  });

  it("allows a resend after the cooldown window elapses", async () => {
    mockFindFirst.mockResolvedValue({
      identifier: "email-verification-otp-a@x.com",
      updatedAt: new Date(Date.now() - (OTP_RESEND_COOLDOWN_SECONDS + 5) * 1000),
    });
    await expect(assertOtpSendCooldown("email-verification-otp-a@x.com")).resolves.toBeUndefined();
  });
});
