import { timingSafeEqual } from "node:crypto";

/**
 * Scheduler endpoint authentication (recurring invoices).
 *
 * The cron route is protected by a shared bearer secret (`CRON_SECRET`).
 * The secret is read lazily here — only the cron execution path requires
 * it — so existing environments without scheduler deployment keep working.
 * Configure the value in the deployment platform (never in source control);
 * `.env.example` documents the placeholder.
 */
export const getCronSecret = (): string => {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "Scheduler is not configured: set a CRON_SECRET of at least 32 characters in the deployment environment.",
    );
  }
  return secret;
};

export const isAuthorizedCronRequest = (authorizationHeader: string | null): boolean => {
  if (!authorizationHeader) return false;
  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return false;
  let expected: string;
  try {
    expected = getCronSecret();
  } catch {
    return false;
  }
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  if (tokenBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(tokenBuffer, expectedBuffer);
};
