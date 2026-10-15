"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Estimate } from "../../domain/entities/estimate";
import { resolveEstimateDisplayStatus } from "../../domain/rules/estimate-rules";
import { EstimateSummaryCards } from "../components/EstimateSummaryCards";
import { EstimateFilterBar } from "../components/EstimateFilterBar";
import { EstimateTable } from "../components/EstimateTable";

export type EstimateListPageProps = {
  initialEstimates?: Estimate[];
};

export const EstimateListPage = ({
  initialEstimates = [],
}: EstimateListPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredEstimates = useMemo(() => {
    return initialEstimates.filter((estimate) => {
      const displayStatus = resolveEstimateDisplayStatus({
        status: estimate.status,
        validUntil: estimate.validUntil,
      });

      if (statusFilter !== "all" && displayStatus !== statusFilter) {
        return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = estimate.estimateNumber.toLowerCase().includes(q);
        const matchesCustomer = estimate.customer.toLowerCase().includes(q);
        const matchesEmail = estimate.customerEmail?.toLowerCase().includes(q);
        const matchesRef = estimate.referenceNumber?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesCustomer && !matchesEmail && !matchesRef) {
          return false;
        }
      }

      return true;
    });
  }, [initialEstimates, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Estimates &amp; Quotations
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create, track, and convert commercial proposals before issuing invoices.
          </p>
        </div>

        <Link
          href="/estimates/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-light active:bg-primary-dark transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          New Estimate
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <EstimateSummaryCards estimates={initialEstimates} />

      {/* Search and Filter Controls */}
      <EstimateFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Estimates Table */}
      <EstimateTable estimates={filteredEstimates} />
    </div>
  );
};
