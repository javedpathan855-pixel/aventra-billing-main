"use client";

import Link from "next/link";
import { CalendarClock, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/form/Button";
import {
  filterSchedules,
  summarizeSchedules,
  type RecurringScheduleFilterOptions,
} from "../../domain/rules/recurring-filter";
import type {
  RecurringSchedule,
  RecurringScheduleStatus,
} from "../../domain/recurring-schedule";
import { RecurringSummaryCards } from "../components/RecurringSummaryCards";
import { RecurringFilterBar } from "../components/RecurringFilterBar";
import { RecurringScheduleTable } from "../components/RecurringScheduleTable";
import { RecurringPagination } from "../components/RecurringPagination";

const PAGE_SIZE = 8;

export type RecurringScheduleListPageProps = {
  initialSchedules?: RecurringSchedule[];
};

export const RecurringScheduleListPage = ({
  initialSchedules = [],
}: RecurringScheduleListPageProps) => {
  const schedules = initialSchedules;
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RecurringScheduleStatus | "All">("All");
  const [frequency, setFrequency] = useState<RecurringSchedule["frequency"] | "All">("All");
  const [customer, setCustomer] = useState("All");
  const [sortBy, setSortBy] = useState<
    NonNullable<RecurringScheduleFilterOptions["sortBy"]>
  >("nextRunDate-asc");
  const [currentPage, setCurrentPage] = useState(1);

  const customersList = useMemo(() => {
    const set = new Set(schedules.map((s) => s.customerName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [schedules]);

  const handleClear = () => {
    setQuery("");
    setStatus("All");
    setFrequency("All");
    setCustomer("All");
    setSortBy("nextRunDate-asc");
    setCurrentPage(1);
  };

  const filtered = useMemo(
    () =>
      filterSchedules(schedules, { query, status, frequency, customer, sortBy }),
    [schedules, query, status, frequency, customer, sortBy],
  );

  const summary = useMemo(() => summarizeSchedules(schedules), [schedules]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginated = useMemo(
    () => filtered.slice(startIndex, startIndex + PAGE_SIZE),
    [filtered, startIndex],
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Recurring Invoices
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Automate repeating customer invoices on weekly, monthly, quarterly, or yearly schedules.
          </p>
        </div>
        <Link
          href="/recurring-invoices/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus shrink-0"
        >
          <Plus size={16} />
          <span>New Schedule</span>
        </Link>
      </header>

      {searchParams.get("saved") === "1" && (
        <p
          className="rounded-lg border border-success/40 bg-success/15 px-4 py-3 text-sm text-success"
          role="status"
        >
          Recurring schedule saved successfully.
        </p>
      )}

      <RecurringSummaryCards summary={summary} />

      <RecurringFilterBar
        query={query}
        onQueryChange={(val) => {
          setQuery(val);
          setCurrentPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setCurrentPage(1);
        }}
        frequency={frequency}
        onFrequencyChange={(val) => {
          setFrequency(val);
          setCurrentPage(1);
        }}
        customer={customer}
        onCustomerChange={(val) => {
          setCustomer(val);
          setCurrentPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        customersList={customersList}
        onClear={handleClear}
      />

      {schedules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
          <CalendarClock className="mx-auto text-text-muted" size={28} />
          <h2 className="mt-4 font-heading text-xl font-semibold text-text-primary">
            No recurring schedules yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-text-secondary">
            Create a schedule to generate customer invoices automatically on every billing period.
          </p>
          <Link
            href="/recurring-invoices/new"
            className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
          >
            <Plus size={17} />
            New Schedule
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
          <CalendarClock className="mx-auto text-text-muted" size={28} />
          <h2 className="mt-4 font-heading text-xl font-semibold text-text-primary">
            No matching schedules
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-text-secondary">
            Try adjusting your search query, status, or frequency filters.
          </p>
          <Button variant="secondary" onClick={handleClear} className="mt-6 px-4">
            <RotateCcw size={16} />
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <RecurringScheduleTable schedules={paginated} />
          <RecurringPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </section>
  );
};
