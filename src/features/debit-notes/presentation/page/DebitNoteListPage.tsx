"use client";

import Link from "next/link";
import { Plus, RotateCcw, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/form/Button";
import {
  filterDebitNotes,
  summarizeDebitNotes,
  type DebitNoteFilterOptions,
} from "../../domain/rules/debit-note-filter";
import type { DebitNote, DebitNoteStatus } from "../../domain/debit-note";
import { DebitNoteSummaryCards } from "../components/DebitNoteSummaryCards";
import { DebitNoteFilterBar } from "../components/DebitNoteFilterBar";
import { DebitNoteTable } from "../components/DebitNoteTable";
import { DebitNotePagination } from "../components/DebitNotePagination";

const PAGE_SIZE = 8;

export type DebitNoteListPageProps = {
  initialDebitNotes?: DebitNote[];
};

export const DebitNoteListPage = ({
  initialDebitNotes = [],
}: DebitNoteListPageProps) => {
  const debitNotes = initialDebitNotes;
  const searchParams = useSearchParams();

  // Filters
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<DebitNoteStatus | "All">("All");
  const [customer, setCustomer] = useState("All");
  const [amountRange, setAmountRange] = useState<
    NonNullable<DebitNoteFilterOptions["amountRange"]>
  >("all");
  const [sortBy, setSortBy] = useState<
    NonNullable<DebitNoteFilterOptions["sortBy"]>
  >("issueDate-desc");

  // Pagination & selection
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // Derive unique customer list for dropdown
  const customersList = useMemo(() => {
    const set = new Set(debitNotes.map((dn) => dn.customerName));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [debitNotes]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: DebitNoteStatus | "All") => {
    setStatus(val);
    setCurrentPage(1);
  };

  const handleCustomerChange = (val: string) => {
    setCustomer(val);
    setCurrentPage(1);
  };

  const handleAmountRangeChange = (
    val: NonNullable<DebitNoteFilterOptions["amountRange"]>,
  ) => {
    setAmountRange(val);
    setCurrentPage(1);
  };

  const handleSortByChange = (
    val: NonNullable<DebitNoteFilterOptions["sortBy"]>,
  ) => {
    setSortBy(val);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setQuery("");
    setStatus("All");
    setCustomer("All");
    setAmountRange("all");
    setSortBy("issueDate-desc");
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const filtered = useMemo(
    () =>
      filterDebitNotes(debitNotes, {
        query,
        status,
        customer,
        amountRange,
        sortBy,
      }),
    [debitNotes, query, status, customer, amountRange, sortBy],
  );

  const summary = useMemo(
    () => summarizeDebitNotes(debitNotes),
    [debitNotes],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedNotes = useMemo(
    () => filtered.slice(startIndex, startIndex + PAGE_SIZE),
    [filtered, startIndex],
  );

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allOnPageSelected = useMemo(
    () =>
      paginatedNotes.length > 0 &&
      paginatedNotes.every((note) => selectedIds.has(note.id)),
    [paginatedNotes, selectedIds],
  );

  const handleToggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedNotes.forEach((note) => next.delete(note.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedNotes.forEach((note) => next.add(note.id));
        return next;
      });
    }
  };

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Debit Notes
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage additional charges and value increments on issued invoices.
          </p>
        </div>
        <Link
          href="/debit-notes/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus shrink-0"
        >
          <Plus size={16} />
          <span>Create Debit Note</span>
        </Link>
      </header>

      {/* Saved notification banner */}
      {searchParams.get("saved") === "1" && (
        <p
          className="rounded-lg border border-success/40 bg-success/15 px-4 py-3 text-sm text-success"
          role="status"
        >
          Debit note saved successfully.
        </p>
      )}

      {/* Summary Cards */}
      <DebitNoteSummaryCards summary={summary} />

      {/* Filter Bar */}
      <DebitNoteFilterBar
        query={query}
        onQueryChange={handleQueryChange}
        status={status}
        onStatusChange={handleStatusChange}
        customer={customer}
        onCustomerChange={handleCustomerChange}
        amountRange={amountRange}
        onAmountRangeChange={handleAmountRangeChange}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        customersList={customersList}
        onClear={handleClear}
      />

      {/* Table & Pagination / Empty State */}
      {debitNotes.length === 0 ? (
        <EmptyState
          title="No debit notes yet"
          text="Issue debit notes against eligible customer invoices for additional charges or corrections."
          action="Create Debit Note"
          href="/debit-notes/new"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching debit notes"
          text="Try adjusting your search query, status, or customer filters."
          action="Clear filters"
          onClick={handleClear}
        />
      ) : (
        <div className="space-y-4">
          <DebitNoteTable
            debitNotes={paginatedNotes}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            allOnPageSelected={allOnPageSelected}
          />

          <DebitNotePagination
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

const EmptyState = ({
  title,
  text,
  action,
  href,
  onClick,
}: {
  title: string;
  text: string;
  action: string;
  href?: string;
  onClick?: () => void;
}) => (
  <div className="rounded-xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
    <TrendingUp className="mx-auto text-text-muted" size={28} />
    <h2 className="mt-4 font-heading text-xl font-semibold text-text-primary">{title}</h2>
    <p className="mx-auto mt-2 max-w-sm text-text-secondary">{text}</p>
    {href ? (
      <Link
        href={href}
        className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
      >
        <Plus size={17} />
        {action}
      </Link>
    ) : (
      <Button variant="secondary" onClick={onClick} className="mt-6 px-4">
        <RotateCcw size={16} />
        {action}
      </Button>
    )}
  </div>
);
