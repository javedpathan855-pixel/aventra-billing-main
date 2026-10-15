"use server";

import { auth } from "../../infrastructure/auth/auth";
import {
  forgotPasswordRequestSchema,
  parseAuthInput,
  resetPasswordSchema,
  withNormalizedEmail,
} from "../validators/auth-schemas";
import { runAuthAction } from "./auth-action";
import { assertOtpSendCooldown, toOtpIdentifier } from "./otp-cooldown";

export type PasswordResetResult = {
  email: string;
};

/**
 * Starts an OTP-based password reset. Always resolves the same way for
 * known and unknown addresses so the endpoint does not become an email
 * enumeration oracle beyond what the UI already implies. Enforces a
 * DB-backed server-side request cooldown (DEF-007) to prevent email abuse.
 */
export const requestPasswordReset = async (rawInput: unknown) =>
  runAuthAction(async (): Promise<PasswordResetResult> => {
    const input = parseAuthInput(
      forgotPasswordRequestSchema,
      withNormalizedEmail(rawInput, "email"),
    );

    await assertOtpSendCooldown(toOtpIdentifier("forget-password", input.email));

    await auth.api.requestPasswordResetEmailOTP({
      body: { email: input.email },
    });

    return { email: input.email };
  });

/**
 * Completes an OTP-based password reset. OTP validity, expiry, and
 * attempt limits are enforced server-side by Better Auth.
 */
export const resetPasswordWithOtp = async (rawInput: unknown) =>
  runAuthAction(async (): Promise<PasswordResetResult> => {
    const input = parseAuthInput(
      resetPasswordSchema,
      withNormalizedEmail(rawInput, "email"),
    );

    await auth.api.resetPasswordEmailOTP({
      body: {
        email: input.email,
        otp: input.code,
        password: input.newPassword,
      },
    });

    return { email: input.email };
  });
