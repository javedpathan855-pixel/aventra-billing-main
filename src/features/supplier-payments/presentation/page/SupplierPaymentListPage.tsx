"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type {
  SupplierPayment,
  SupplierPaymentMethod,
  SupplierPaymentStatus,
} from "../../domain/supplier-payment";
import { SupplierPaymentSummaryCards } from "../components/SupplierPaymentSummaryCards";
import { SupplierPaymentFilterBar } from "../components/SupplierPaymentFilterBar";
import { SupplierPaymentTable } from "../components/SupplierPaymentTable";
import { Pagination } from "@/shared/components/table/Pagination";

export type SupplierPaymentListPageProps = {
  initialPayments?: SupplierPayment[];
  metrics?: {
    totalPayments: number;
    totalAmount: number;
    activeCount: number;
    activeAmount: number;
    reversedCount: number;
    billsCovered: number;
  };
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  initialQuery?: string;
  initialStatus?: string;
  initialMethod?: string;
};

export const SupplierPaymentListPage = ({
  initialPayments = [],
  metrics,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  totalPages = 1,
  initialQuery = "",
  initialStatus = "all",
  initialMethod = "all",
}: SupplierPaymentListPageProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [methodFilter, setMethodFilter] = useState(initialMethod);

  const navigateWithFilters = (
    query: string,
    status: string,
    method: string,
    nextPage: number,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }
    if (status && status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    if (method && method !== "all") {
      params.set("method", method);
    } else {
      params.delete("method");
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    navigateWithFilters(query, statusFilter, methodFilter, 1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status as SupplierPaymentStatus | "all");
    navigateWithFilters(searchQuery, status, methodFilter, 1);
  };

  const handleMethodChange = (method: string) => {
    setMethodFilter(method as SupplierPaymentMethod | "all");
    navigateWithFilters(searchQuery, statusFilter, method, 1);
  };

  const handlePageChange = (nextPage: number) => {
    navigateWithFilters(searchQuery, statusFilter, methodFilter, nextPage);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Supplier Payments
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Pay posted purchase bills in full, track allocations per bill, and
            reverse payments that were recorded in error.
          </p>
        </div>

        <Link
          href="/supplier-payments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light active:bg-primary-dark transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          Record Payment
        </Link>
      </div>

      <SupplierPaymentSummaryCards payments={initialPayments} metrics={metrics} />

      <SupplierPaymentFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
        methodFilter={methodFilter}
        onMethodChange={handleMethodChange}
      />

      <SupplierPaymentTable payments={initialPayments} />

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemName="supplier payments"
        />
      )}
    </section>
  );
};
