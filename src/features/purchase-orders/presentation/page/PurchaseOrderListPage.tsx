"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { PurchaseOrder } from "../../domain/entities/purchase-order";
import { PurchaseOrderSummaryCards } from "../components/PurchaseOrderSummaryCards";
import { PurchaseOrderFilterBar } from "../components/PurchaseOrderFilterBar";
import { PurchaseOrderTable } from "../components/PurchaseOrderTable";
import { Pagination } from "@/shared/components/table/Pagination";

export type PurchaseOrderListPageProps = {
  initialOrders?: PurchaseOrder[];
  metrics?: {
    totalOrders: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    receivedCount: number;
  };
  totalCount?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  initialQuery?: string;
  initialStatus?: string;
};

export const PurchaseOrderListPage = ({
  initialOrders = [],
  metrics,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  totalPages = 1,
  initialQuery = "",
  initialStatus = "all",
}: PurchaseOrderListPageProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  const navigateWithFilters = (query: string, status: string, nextPage: number) => {
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
    navigateWithFilters(query, statusFilter, 1);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    navigateWithFilters(searchQuery, status, 1);
  };

  const handlePageChange = (nextPage: number) => {
    navigateWithFilters(searchQuery, statusFilter, nextPage);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create and track orders placed with suppliers, monitor goods
            receipt, and stay aligned with Purchase Settings numbering.
          </p>
        </div>

        <Link
          href="/purchase-orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light active:bg-primary-dark transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          New Purchase Order
        </Link>
      </div>

      <PurchaseOrderSummaryCards orders={initialOrders} metrics={metrics} />

      <PurchaseOrderFilterBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
      />

      <PurchaseOrderTable orders={initialOrders} />

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemName="purchase orders"
        />
      )}
    </section>
  );
};
