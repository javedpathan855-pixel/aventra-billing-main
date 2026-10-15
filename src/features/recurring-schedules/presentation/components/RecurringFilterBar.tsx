import { RotateCcw, Search } from "lucide-react";
import type { ChangeEvent } from "react";
import type { RecurringScheduleFilterOptions } from "../../domain/rules/recurring-filter";
import type { RecurringSchedule } from "../../domain/recurring-schedule";
import { Button, Input, Select } from "@/shared/components/form";

const statuses: Array<NonNullable<RecurringScheduleFilterOptions["status"]>> = [
  "All",
  "Active",
  "Paused",
  "Completed",
  "Cancelled",
];

const frequencies: Array<RecurringSchedule["frequency"] | "All"> = [
  "All",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];

export type RecurringFilterBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  status: NonNullable<RecurringScheduleFilterOptions["status"]>;
  onStatusChange: (status: NonNullable<RecurringScheduleFilterOptions["status"]>) => void;
  frequency: RecurringSchedule["frequency"] | "All";
  onFrequencyChange: (frequency: RecurringSchedule["frequency"] | "All") => void;
  customer: string;
  onCustomerChange: (customer: string) => void;
  sortBy: NonNullable<RecurringScheduleFilterOptions["sortBy"]>;
  onSortByChange: (sortBy: NonNullable<RecurringScheduleFilterOptions["sortBy"]>) => void;
  customersList: string[];
  onClear: () => void;
};

export const RecurringFilterBar = ({
  query,
  onQueryChange,
  status,
  onStatusChange,
  frequency,
  onFrequencyChange,
  customer,
  onCustomerChange,
  sortBy,
  onSortByChange,
  customersList,
  onClear,
}: RecurringFilterBarProps) => (
  <div className="rounded-xl border border-border bg-surface-card p-3 sm:p-4 space-y-3 transition-colors">
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex-1 min-w-[220px]">
        <label htmlFor="recurring-search" className="sr-only">
          Search by schedule name or customer
        </label>
        <Input
          id="recurring-search"
          type="text"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          placeholder="Search schedule, customer..."
          startIcon={<Search size={16} />}
          className="h-10 text-sm"
        />
      </div>

      <div className="shrink-0 w-full sm:w-36 md:w-40">
        <label htmlFor="recurring-status-filter" className="sr-only">
          Filter by status
        </label>
        <Select
          id="recurring-status-filter"
          value={status}
          onChange={(val) =>
            onStatusChange(val as NonNullable<RecurringScheduleFilterOptions["status"]>)
          }
          className="h-10"
        >
          <option value="All">All Statuses</option>
          {statuses.slice(1).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div className="shrink-0 w-full sm:w-36 md:w-40">
        <label htmlFor="recurring-frequency-filter" className="sr-only">
          Filter by frequency
        </label>
        <Select
          id="recurring-frequency-filter"
          value={frequency}
          onChange={(val) => onFrequencyChange(val as RecurringSchedule["frequency"] | "All")}
          className="h-10"
        >
          {frequencies.map((f) => (
            <option key={f} value={f}>
              {f === "All" ? "All Frequencies" : f}
            </option>
          ))}
        </Select>
      </div>

      <div className="shrink-0 w-full sm:w-44 md:w-48">
        <label htmlFor="recurring-customer-filter" className="sr-only">
          Filter by customer
        </label>
        <Select
          id="recurring-customer-filter"
          value={customer}
          onChange={(val) => onCustomerChange(val)}
          className="h-10"
        >
          <option value="All">All Customers</option>
          {customersList.map((cust) => (
            <option key={cust} value={cust}>
              {cust}
            </option>
          ))}
        </Select>
      </div>

      <div className="shrink-0 w-full sm:w-40 md:w-44">
        <label htmlFor="recurring-sort-filter" className="sr-only">
          Sort by
        </label>
        <Select
          id="recurring-sort-filter"
          value={sortBy}
          onChange={(val) =>
            onSortByChange(val as NonNullable<RecurringScheduleFilterOptions["sortBy"]>)
          }
          className="h-10"
        >
          <option value="nextRunDate-asc">Next Run: Earliest First</option>
          <option value="nextRunDate-desc">Next Run: Latest First</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="created-desc">Created: Newest First</option>
        </Select>
      </div>

      {(query ||
        status !== "All" ||
        frequency !== "All" ||
        customer !== "All" ||
        sortBy !== "nextRunDate-asc") && (
        <Button
          variant="secondary"
          onClick={onClear}
          aria-label="Clear all filters"
          className="h-10 px-3 text-xs shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </Button>
      )}
    </div>
  </div>
);
