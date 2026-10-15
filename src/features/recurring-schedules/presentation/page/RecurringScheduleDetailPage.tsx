"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Pause,
  Pencil,
  Play,
  Printer,
  RotateCcw,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/form/Button";
import type {
  RecurringOccurrence,
  RecurringSchedule,
} from "../../domain/recurring-schedule";
import { RecurringStatusBadge } from "../components/RecurringStatusBadge";
import { OccurrenceStatusBadge } from "../components/OccurrenceStatusBadge";
import {
  cancelRecurringScheduleAction,
  completeRecurringScheduleAction,
  deleteRecurringScheduleAction,
  pauseRecurringScheduleAction,
  resumeRecurringScheduleAction,
} from "../../data/mutations/recurring-schedule-mutations";
import {
  retryRecurringOccurrenceAction,
  triggerRecurringScheduleAction,
} from "../../data/mutations/trigger-recurring-schedule";

export type RecurringScheduleDetailPageProps = {
  initialSchedule?: RecurringSchedule | null;
  initialOccurrences?: RecurringOccurrence[];
};

export const RecurringScheduleDetailPage = ({
  initialSchedule,
  initialOccurrences = [],
}: RecurringScheduleDetailPageProps) => {
  const router = useRouter();
  const [schedule, setSchedule] = useState<RecurringSchedule | null | undefined>(
    initialSchedule,
  );
  const [occurrences, setOccurrences] = useState<RecurringOccurrence[]>(initialOccurrences);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!schedule) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Schedule not found
        </h1>
        <p className="mx-auto mt-2 max-w-md text-text-secondary">
          The requested recurring schedule does not exist or does not belong to your organization.
        </p>
        <Link
          href="/recurring-invoices"
          className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
        >
          <ArrowLeft size={17} />
          <span>Return to recurring invoices</span>
        </Link>
      </div>
    );
  }

  const refresh = () => router.refresh();

  const runAction = async (
    label: string,
    action: () => Promise<{ success: boolean; error?: string; data?: unknown }>,
    apply?: (data: unknown) => void,
  ) => {
    setIsProcessing(true);
    setActionError(null);
    setActionNotice(null);
    const result = await action();
    if (!result.success) {
      setActionError(result.error || `${label} failed.`);
      setIsProcessing(false);
      return;
    }
    if (apply) {
      apply(result.data);
    }
    setIsProcessing(false);
    refresh();
  };

  const confirmAnd = (message: string, fn: () => Promise<void>) => {
    if (!confirm(message)) {
      return;
    }
    void fn();
  };

  const handleTrigger = () =>
    runAction("Manual run", () => triggerRecurringScheduleAction(schedule.id), (data) => {
      const summary = data as { succeeded?: number; failed?: number } | undefined;
      setActionNotice(
        `Run finished: ${summary?.succeeded ?? 0} generated, ${summary?.failed ?? 0} failed.`,
      );
    });

  const handleRetry = (occurrenceId: string) =>
    runAction("Retry", () => retryRecurringOccurrenceAction(occurrenceId), () => {
      setOccurrences((current) =>
        current.map((occ) =>
          occ.id === occurrenceId ? { ...occ, status: "Pending" as const, error: undefined } : occ,
        ),
      );
    });

  const succeededOccurrences = occurrences.filter((occ) => occ.status === "Succeeded");
  const isEditable = schedule.status === "Active" || schedule.status === "Paused";

  return (
    <section className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/recurring-invoices"
            className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            <span>Back to recurring invoices</span>
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-bold text-text-primary">
              {schedule.name}
            </h1>
            <RecurringStatusBadge status={schedule.status} />
          </div>
          <p className="mt-2 text-text-secondary">
            {schedule.customerName} · {schedule.frequency} · Next run {schedule.nextRunDate}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {schedule.status === "Active" && (
            <>
              <Button
                variant="secondary"
                disabled={isProcessing}
                onClick={() =>
                  confirmAnd("Pause this schedule? Automatic generation will stop.", () =>
                    runAction("Pause", () => pauseRecurringScheduleAction(schedule.id), (data) =>
                      setSchedule(data as RecurringSchedule),
                    ),
                  )
                }
                className="px-3.5"
              >
                <Pause size={15} />
                <span>Pause</span>
              </Button>
              <Button
                variant="primary"
                disabled={isProcessing}
                onClick={() =>
                  confirmAnd("Generate all due invoices for this schedule now?", handleTrigger)
                }
                className="px-4"
              >
                <Zap size={15} />
                <span>{isProcessing ? "Running..." : "Run Now"}</span>
              </Button>
            </>
          )}
          {schedule.status === "Paused" && (
            <Button
              variant="primary"
              disabled={isProcessing}
              onClick={() =>
                runAction("Resume", () => resumeRecurringScheduleAction(schedule.id), (data) =>
                  setSchedule(data as RecurringSchedule),
                )
              }
              className="px-4"
            >
              <Play size={15} />
              <span>Resume</span>
            </Button>
          )}
          {isEditable && (
            <>
              <Link
                href={`/recurring-invoices/new?edit=${schedule.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-alt px-3.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Pencil size={15} />
                <span>Edit</span>
              </Link>
              <Button
                variant="secondary"
                disabled={isProcessing}
                onClick={() =>
                  confirmAnd(
                    "Mark this schedule as completed? No further invoices will be generated.",
                    () =>
                      runAction("Complete", () => completeRecurringScheduleAction(schedule.id), (data) =>
                        setSchedule(data as RecurringSchedule),
                      ),
                  )
                }
                className="px-3.5"
              >
                <CheckCircle2 size={15} />
                <span>Complete</span>
              </Button>
              <Button
                variant="secondary"
                disabled={isProcessing}
                onClick={() =>
                  confirmAnd("Cancel this schedule? No further invoices will be generated.", () =>
                    runAction("Cancel", () => cancelRecurringScheduleAction(schedule.id), (data) =>
                      setSchedule(data as RecurringSchedule),
                    ),
                  )
                }
                className="px-3.5"
              >
                <Ban size={15} />
                <span>Cancel</span>
              </Button>
              {succeededOccurrences.length === 0 && (
                <Button
                  variant="secondary"
                  disabled={isProcessing}
                  onClick={() =>
                    confirmAnd("Delete this schedule? Its history will be removed.", () =>
                      runAction("Delete", () => deleteRecurringScheduleAction(schedule.id)).then(
                        () => router.push("/recurring-invoices"),
                      ),
                    )
                  }
                  className="px-3.5 text-danger hover:text-danger-light"
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </Button>
              )}
            </>
          )}
          <Button variant="secondary" onClick={() => window.print()} className="px-4">
            <Printer size={15} />
            <span>Print</span>
          </Button>
        </div>
      </header>

      {actionError && (
        <div
          className="rounded-lg border border-error/40 bg-error/15 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {actionError}
        </div>
      )}
      {actionNotice && (
        <p
          className="rounded-lg border border-success/40 bg-success/15 px-4 py-3 text-sm text-success"
          role="status"
        >
          {actionNotice}
        </p>
      )}

      {/* Schedule facts */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Next Run</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">{schedule.nextRunDate}</p>
          <p className="mt-1 text-xs text-text-muted">{schedule.frequency} · {schedule.timezone}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Invoices Generated</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">{schedule.successCount}</p>
          <p className="mt-1 text-xs text-text-muted">
            {schedule.failureCount} failed · {schedule.consecutiveFailures} consecutive
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Billing Window</p>
          <p className="mt-1 font-heading text-xl font-bold tabular-nums">{schedule.startDate}</p>
          <p className="mt-1 text-xs text-text-muted">
            {schedule.endDate ? `ends ${schedule.endDate}` : "no end date"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <p className="text-xs text-text-secondary">Last Result</p>
          <p className="mt-1 text-sm font-medium text-text-primary leading-snug">
            {schedule.lastResult || "Never run"}
          </p>
          {schedule.lastRunAt && (
            <p className="mt-1 text-xs text-text-muted">{schedule.lastRunAt}</p>
          )}
        </div>
      </div>

      {/* Generated invoices */}
      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Generated Invoices ({succeededOccurrences.length})
        </h2>
        {succeededOccurrences.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">
            No invoices generated yet. Use Run Now or wait for the scheduler.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border/60">
            {succeededOccurrences.map((occ) => (
              <div
                key={occ.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  {occ.invoiceId ? (
                    <Link
                      href={`/invoices/${occ.invoiceId}`}
                      className="font-medium text-primary-light hover:underline"
                    >
                      {occ.invoiceNumber || "View Invoice"}
                    </Link>
                  ) : (
                    <span className="font-medium text-text-primary">Invoice pending link</span>
                  )}
                  <span className="ml-2 text-xs text-text-muted">
                    Period {occ.periodKey}
                  </span>
                </div>
                <OccurrenceStatusBadge status={occ.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generation history */}
      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Generation History ({occurrences.length})
        </h2>
        {occurrences.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">
            No billing periods processed yet.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border/60">
            {occurrences.map((occ) => (
              <div
                key={occ.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <div>
                  <span className="font-medium tabular-nums text-text-primary">
                    {occ.periodKey}
                  </span>
                  <span className="ml-2 text-xs text-text-muted">
                    {occ.attempts} attempt{occ.attempts === 1 ? "" : "s"}
                  </span>
                  {occ.error && (
                    <p className="mt-0.5 max-w-md text-xs text-error">{occ.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <OccurrenceStatusBadge status={occ.status} />
                  {occ.status === "Failed" && schedule.status !== "Completed" && schedule.status !== "Cancelled" && (
                    <Button
                      variant="secondary"
                      disabled={isProcessing}
                      onClick={() => handleRetry(occ.id)}
                      className="h-8 px-3 text-xs"
                    >
                      <RotateCcw size={13} />
                      <span>Retry</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Template snapshot note */}
      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-5 text-sm text-text-secondary">
        <p>
          Template snapshot: {schedule.items.length} line item
          {schedule.items.length === 1 ? "" : "s"}, {schedule.paymentTerms}, timezone{" "}
          {schedule.timezone}. Edits apply to future invoices only — already generated
          invoices keep their own snapshots. Customer and prices are captured per
          generation from this template.
        </p>
      </div>
    </section>
  );
};
