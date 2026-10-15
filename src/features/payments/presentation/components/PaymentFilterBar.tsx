import { RotateCcw, Search } from "lucide-react";
import type { ChangeEvent } from "react";
import type { PaymentFilterOptions } from "../../domain/rules/payment-filter";
import { PAYMENT_METHODS, type PaymentMethod, type PaymentStatus } from "../../domain/payment";
import { Button, Input, Select } from "@/shared/components/form";

const statuses: Array<PaymentStatus | "All"> = ["All", "Active", "Reversed"];

export type PaymentFilterBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  status: PaymentStatus | "All";
  onStatusChange: (status: PaymentStatus | "All") => void;
  method: PaymentMethod | "All";
  onMethodChange: (method: PaymentMethod | "All") => void;
  customer: string;
  onCustomerChange: (customer: string) => void;
  sortBy: NonNullable<PaymentFilterOptions["sortBy"]>;
  onSortByChange: (sortBy: NonNullable<PaymentFilterOptions["sortBy"]>) => void;
  customersList: string[];
  onClear: () => void;
};

export const PaymentFilterBar = ({
  query,
  onQueryChange,
  status,
  onStatusChange,
  method,
  onMethodChange,
  customer,
  onCustomerChange,
  sortBy,
  onSortByChange,
  customersList,
  onClear,
}: PaymentFilterBarProps) => (
  <div className="rounded-xl border border-border bg-surface-card p-3 sm:p-4 space-y-3 transition-colors">
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex-1 min-w-[220px]">
        <label htmlFor="payment-search" className="sr-only">
          Search by customer, reference, or notes
        </label>
        <Input
          id="payment-search"
          type="text"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          placeholder="Search customer, reference, notes..."
          startIcon={<Search size={16} />}
          className="h-10 text-sm"
        />
      </div>

      <div className="shrink-0 w-full sm:w-36 md:w-40">
        <label htmlFor="payment-status-filter" className="sr-only">
          Filter by status
        </label>
        <Select
          id="payment-status-filter"
          value={status}
          onChange={(val) => onStatusChange(val as PaymentStatus | "All")}
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
        <label htmlFor="payment-method-filter" className="sr-only">
          Filter by method
        </label>
        <Select
          id="payment-method-filter"
          value={method}
          onChange={(val) => onMethodChange(val as PaymentMethod | "All")}
          className="h-10"
        >
          <option value="All">All Methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </div>

      <div className="shrink-0 w-full sm:w-44 md:w-48">
        <label htmlFor="payment-customer-filter" className="sr-only">
          Filter by customer
        </label>
        <Select
          id="payment-customer-filter"
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
        <label htmlFor="payment-sort-filter" className="sr-only">
          Sort by
        </label>
        <Select
          id="payment-sort-filter"
          value={sortBy}
          onChange={(val) =>
            onSortByChange(val as NonNullable<PaymentFilterOptions["sortBy"]>)
          }
          className="h-10"
        >
          <option value="paymentDate-desc">Date: Newest First</option>
          <option value="paymentDate-asc">Date: Oldest First</option>
          <option value="amount-desc">Amount: Highest First</option>
          <option value="amount-asc">Amount: Lowest First</option>
        </Select>
      </div>

      {(query || status !== "All" || method !== "All" || customer !== "All" || sortBy !== "paymentDate-desc") && (
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
