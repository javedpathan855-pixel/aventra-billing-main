"use client";

import Link from "next/link";
import { Banknote, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/form/Button";
import {
  filterPayments,
  summarizePayments,
  type PaymentFilterOptions,
} from "../../domain/rules/payment-filter";
import type { Payment, PaymentMethod, PaymentStatus } from "../../domain/payment";
import { PaymentSummaryCards } from "../components/PaymentSummaryCards";
import { PaymentFilterBar } from "../components/PaymentFilterBar";
import { PaymentTable } from "../components/PaymentTable";
import { PaymentPagination } from "../components/PaymentPagination";

const PAGE_SIZE = 8;

export type PaymentListPageProps = {
  initialPayments?: Payment[];
};

export const PaymentListPage = ({
  initialPayments = [],
}: PaymentListPageProps) => {
  const payments = initialPayments;
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "All">("All");
  const [method, setMethod] = useState<PaymentMethod | "All">("All");
  const [customer, setCustomer] = useState("All");
  const [sortBy, setSortBy] = useState<
    NonNullable<PaymentFilterOptions["sortBy"]>
  >("paymentDate-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const customersList = useMemo(() => {
    const set = new Set(payments.map((p) => p.customerName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [payments]);

  const handleClear = () => {
    setQuery("");
    setStatus("All");
    setMethod("All");
    setCustomer("All");
    setSortBy("paymentDate-desc");
    setCurrentPage(1);
  };

  const filtered = useMemo(
    () =>
      filterPayments(payments, { query, status, method, customer, sortBy }),
    [payments, query, status, method, customer, sortBy],
  );

  const summary = useMemo(() => summarizePayments(payments), [payments]);

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
            Payments Received
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Record customer cash receipts and track invoice allocations.
          </p>
        </div>
        <Link
          href="/payments/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus shrink-0"
        >
          <Plus size={16} />
          <span>Record Payment</span>
        </Link>
      </header>

      {searchParams.get("saved") === "1" && (
        <p
          className="rounded-lg border border-success/40 bg-success/15 px-4 py-3 text-sm text-success"
          role="status"
        >
          Payment recorded successfully.
        </p>
      )}

      <PaymentSummaryCards summary={summary} />

      <PaymentFilterBar
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
        method={method}
        onMethodChange={(val) => {
          setMethod(val);
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

      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
          <Banknote className="mx-auto text-text-muted" size={28} />
          <h2 className="mt-4 font-heading text-xl font-semibold text-text-primary">
            No payments recorded yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-text-secondary">
            Record cash received from a customer and allocate it to their open invoices.
          </p>
          <Link
            href="/payments/new"
            className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
          >
            <Plus size={17} />
            Record Payment
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
          <Banknote className="mx-auto text-text-muted" size={28} />
          <h2 className="mt-4 font-heading text-xl font-semibold text-text-primary">
            No matching payments
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-text-secondary">
            Try adjusting your search query, status, or method filters.
          </p>
          <Button variant="secondary" onClick={handleClear} className="mt-6 px-4">
            <RotateCcw size={16} />
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <PaymentTable payments={paginated} />
          <PaymentPagination
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
