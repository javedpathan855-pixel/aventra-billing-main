import { NextResponse } from "next/server";
import { processDueSchedules } from "@/features/recurring-schedules";
import { isAuthorizedCronRequest } from "@/features/recurring-schedules/infrastructure/config/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Scheduled recurring-billing entrypoint.
 *
 * Triggered by the deployment platform's scheduler (external cron), never by
 * browsers, timers, or login sessions. Protected by the CRON_SECRET bearer
 * token — unauthenticated callers learn nothing beyond a 401. Processes all
 * due schedules idempotently; safe to retry and safe under concurrent
 * invocation. See reports/recurring-invoice-implementation-report.md §5 for
 * deployment configuration.
 */
export const POST = async (request: Request): Promise<NextResponse> => {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const summary = await processDueSchedules({ workerId: "cron" });

  return NextResponse.json({
    ok: true,
    schedulesChecked: summary.schedulesChecked,
    occurrencesProcessed: summary.occurrencesProcessed,
    succeeded: summary.succeeded,
    failed: summary.failed,
    skipped: summary.skipped,
  });
};

export const GET = async (): Promise<NextResponse> =>
  NextResponse.json({ ok: false, error: "Method not allowed." }, { status: 405 });
