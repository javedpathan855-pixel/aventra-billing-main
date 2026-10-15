import { getPrisma } from "@/shared/lib/prisma";
import { OtpRateLimitedError } from "../../domain/errors/auth-errors";

/**
 * Server-side OTP send cooldown (DEF-007). DB-backed via the shared
 * Verification table, so it holds across instances (unlike a process-local
 * in-memory bucket). Identifiers follow Better Auth's emailOTP format
 * `{type}-otp-{lowercase email}` — verified against the installed
 * better-auth email-otp plugin.
 */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const toOtpIdentifier = (type: string, email: string): string =>
  `${type}-otp-${email.toLowerCase()}`;

export const assertOtpSendCooldown = async (identifier: string): Promise<void> => {
  const record = await getPrisma().verification.findFirst({
    where: { identifier },
    orderBy: { updatedAt: "desc" },
  });
  if (record === null) {
    return;
  }
  const elapsedMs = Date.now() - record.updatedAt.getTime();
  if (elapsedMs < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw new OtpRateLimitedError();
  }
};
