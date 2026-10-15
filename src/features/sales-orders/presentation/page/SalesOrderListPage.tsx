"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SalesOrder } from "../../domain/entities/sales-order";
import { SalesOrderSummaryCards } from "../components/SalesOrderSummaryCards";
import { SalesOrderFilterBar } from "../components/SalesOrderFilterBar";
import { SalesOrderTable } from "../components/SalesOrderTable";

export type SalesOrderListPageProps = {
  initialOrders?: SalesOrder[];
  metrics?: {
    totalOrders: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    fulfilledCount: number;
    invoicedCount: number;
  };
};

export const SalesOrderListPage = ({
  initialOrders = [],
  metrics,
}: SalesOrderListPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = useMemo(() => {
    return initialOrders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = order.orderNumber.toLowerCase().includes(q);
        const matchesCustomer = order.customerName.toLowerCase().includes(q);
        const matchesEmail = order.customerEmail?.toLowerCase().includes(q);
        const matchesRef = order.referenceNumber?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesCustomer && !matchesEmail && !matchesRef) {
          return false;
        }
      }

      return true;
    });
  }, [initialOrders, searchQuery, statusFilter]);

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Sales Orders
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track confirmed customer orders, monitor delivery progress, and issue genuine invoices.
          </p>
        </div>

        <Link
          href="/sales-orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light active:bg-primary-dark transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          New Sales Order
        </Link>
      </div>

      {/* Summary Metrics Cards */}
      <SalesOrderSummaryCards orders={initialOrders} metrics={metrics} />

      {/* Search and Status Filters */}
      <SalesOrderFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Sales Orders Table */}
      <SalesOrderTable orders={filteredOrders} />
    </section>
  );
};
