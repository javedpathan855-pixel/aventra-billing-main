"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierStatus } from "../../domain/entities/supplier";
import type { SupplierDto } from "../../data/dto/supplier-dto";
import { SupplierFilterBar } from "../components/SupplierFilterBar";
import { SupplierTable } from "../components/SupplierTable";
import { Pagination } from "@/shared/components/table";

export type SupplierListPageProps = {
  initialSuppliers?: SupplierDto[];
  totalCount?: number;
  initialQuery?: string;
  initialStatus?: SupplierStatus | "ALL";
  initialPage?: number;
  pageSize?: number;
  showSavedBanner?: boolean;
};

const buildSuppliersUrl = (params: {
  query: string;
  status: SupplierStatus | "ALL";
  page: number;
}): string => {
  const search = new URLSearchParams();
  if (params.query.trim().length > 0) search.set("query", params.query.trim());
  if (params.status !== "ALL") search.set("status", params.status);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix.length > 0 ? `/suppliers?${suffix}` : "/suppliers";
};

export const SupplierListPage = ({
  initialSuppliers = [],
  totalCount = 0,
  initialQuery = "",
  initialStatus = "ALL",
  initialPage = 1,
  pageSize = 8,
  showSavedBanner = false,
}: SupplierListPageProps) => {
  const router = useRouter();

  // Draft query text (committed to the URL — and therefore the server query
  // — debounced). The route remounts this page via `key` on navigation, so
  // local state always starts from the current URL parameters.
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [status, setStatus] = useState<SupplierStatus | "ALL">(initialStatus);

  useEffect(() => {
    if (draftQuery.trim() === initialQuery.trim()) return;
    const timer = setTimeout(() => {
      router.push(buildSuppliersUrl({ query: draftQuery, status, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [draftQuery, initialQuery, status, router]);

  const handleStatusChange = (val: SupplierStatus | "ALL") => {
    setStatus(val);
    router.push(buildSuppliersUrl({ query: draftQuery, status: val, page: 1 }));
  };

  const handleResetFilters = () => {
    setDraftQuery("");
    setStatus("ALL");
    router.push("/suppliers");
  };

  const handlePageChange = (page: number) => {
    router.push(buildSuppliersUrl({ query: draftQuery, status, page }));
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isFiltered =
    initialQuery.trim().length > 0 || initialStatus !== "ALL";

  const rangeStart = useMemo(() => {
    if (totalCount === 0) return 0;
    return (initialPage - 1) * pageSize + 1;
  }, [totalCount, initialPage, pageSize]);

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Suppliers
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage supplier records and purchase information.
          </p>
        </div>

        <Link
          href="/suppliers/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus shrink-0"
        >
          <Plus size={16} />
          <span>Add Supplier</span>
        </Link>
      </header>

      {/* Success feedback banner */}
      {showSavedBanner && (
        <p
          className="rounded-lg border border-success/40 bg-success/15 px-4 py-3 text-sm text-success"
          role="status"
        >
          Supplier record saved successfully.
        </p>
      )}

      {/* Filter Row */}
      <SupplierFilterBar
        query={draftQuery}
        onQueryChange={setDraftQuery}
        status={status}
        onStatusChange={handleStatusChange}
        onReset={handleResetFilters}
      />

      {/* Suppliers Data Table */}
      <SupplierTable
        suppliers={initialSuppliers}
        isFiltered={isFiltered}
        onClearFilters={handleResetFilters}
      />

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-text-secondary">
            Showing {rangeStart} to{" "}
            {Math.min(initialPage * pageSize, totalCount)} of {totalCount} suppliers
          </p>
          <Pagination
            currentPage={initialPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </section>
  );
};
