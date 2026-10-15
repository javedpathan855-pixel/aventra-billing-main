"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/shared/components/form";
import { Input, Select } from "@/shared/components/form";
import type { SupplierStatus } from "../../domain/entities/supplier";

export type SupplierFilterBarProps = {
  query: string;
  onQueryChange: (val: string) => void;
  status: SupplierStatus | "ALL";
  onStatusChange: (val: SupplierStatus | "ALL") => void;
  onReset: () => void;
};

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const SupplierFilterBar = ({
  query,
  onQueryChange,
  status,
  onStatusChange,
  onReset,
}: SupplierFilterBarProps) => {
  const hasActiveFilters = query.trim().length > 0 || status !== "ALL";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="min-w-0 flex-1">
        <Input
          id="supplier-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search suppliers by name, email, phone, or GSTIN..."
          startIcon={<Search size={16} />}
          aria-label="Search suppliers"
          className="h-10 text-sm"
        />
      </div>

      {/* Status Dropdown */}
      <div className="w-full sm:w-40 shrink-0">
        <Select
          id="filter-supplier-status"
          value={status}
          onChange={(val) => onStatusChange(val as SupplierStatus | "ALL")}
          options={statusOptions}
          aria-label="Filter by status"
          className="h-10 text-sm"
        />
      </div>

      {/* Reset */}
      <div className="shrink-0">
        <Button
          type="button"
          variant="secondary"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className="h-10 w-full px-4 text-sm sm:w-auto"
          aria-label="Reset supplier filters"
        >
          <RotateCcw size={15} />
          <span>Reset</span>
        </Button>
      </div>
    </div>
  );
};
