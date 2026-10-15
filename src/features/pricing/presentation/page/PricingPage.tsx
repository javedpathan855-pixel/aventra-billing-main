"use client";

import { useMemo, useState } from "react";
import type { ProductStatus, ProductType } from "@/features/products/domain/entities/product";
import type { PricingEntryDto } from "../../data/dto/pricing-dto";
import { PricingFilterBar } from "../components/PricingFilterBar";
import { PricingTable } from "../components/PricingTable";
import { Pagination } from "@/shared/components/table";

const PAGE_SIZE = 10;

export type PricingPageProps = {
  initialEntries?: PricingEntryDto[];
  categoryOptions?: string[];
};

export const PricingPage = ({
  initialEntries = [],
  categoryOptions = [],
}: PricingPageProps) => {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ProductType | "ALL">("ALL");
  const [category, setCategory] = useState<string | "ALL">("ALL");
  const [status, setStatus] = useState<ProductStatus | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const resetPage = () => setCurrentPage(1);

  const handleResetFilters = () => {
    setQuery("");
    setType("ALL");
    setCategory("ALL");
    setStatus("ALL");
    setCurrentPage(1);
  };

  const filteredEntries = useMemo(() => {
    return initialEntries.filter((e) => {
      if (type !== "ALL" && e.type !== type) return false;
      if (category !== "ALL" && (e.category || "General") !== category) return false;
      if (status !== "ALL" && e.status !== status) return false;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const haystack = `${e.name} ${e.category ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [initialEntries, type, category, status, query]);

  const totalCount = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const isFiltered =
    query.trim().length > 0 || type !== "ALL" || category !== "ALL" || status !== "ALL";

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Pricing
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage selling prices and purchase costs. Prices are tax-exclusive and apply to future documents only.
          </p>
        </div>
      </header>

      <PricingFilterBar
        query={query}
        onQueryChange={(val) => {
          setQuery(val);
          resetPage();
        }}
        type={type}
        onTypeChange={(val) => {
          setType(val);
          resetPage();
        }}
        category={category}
        onCategoryChange={(val) => {
          setCategory(val);
          resetPage();
        }}
        categoryOptions={categoryOptions}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          resetPage();
        }}
        onReset={handleResetFilters}
      />

      <PricingTable
        entries={paginatedEntries}
        isFiltered={isFiltered}
        onClearFilters={handleResetFilters}
      />

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-4 sm:flex-row">
          <p className="text-xs text-text-secondary">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} items
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            itemName="items"
          />
        </div>
      )}
    </section>
  );
};
