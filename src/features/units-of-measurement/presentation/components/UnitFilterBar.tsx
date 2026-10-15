"use client";

import { RotateCcw, Search } from "lucide-react";
import { Input, Select } from "@/shared/components/form";
import type { UnitStatus } from "../../domain/entities/unit";

export type UnitFilterBarProps = {
  query: string;
  onQueryChange: (val: string) => void;
  status: UnitStatus | "ALL";
  onStatusChange: (val: UnitStatus | "ALL") => void;
  onReset: () => void;
};

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const UnitFilterBar = ({
  query,
  onQueryChange,
  status,
  onStatusChange,
  onReset,
}: UnitFilterBarProps) => {
  const hasActiveFilters = query.trim().length > 0 || status !== "ALL";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Input
          id="unit-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search units by code, name, or description..."
          startIcon={<Search size={16} />}
          aria-label="Search units"
          className="h-10 text-sm"
        />
      </div>

      <div className="w-full sm:w-36 shrink-0">
        <Select
          id="filter-unit-status"
          value={status}
          onChange={(val) => onStatusChange(val as UnitStatus | "ALL")}
          options={statusOptions}
          aria-label="Filter by status"
          className="h-10 text-sm"
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 text-xs font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus cursor-pointer shrink-0"
          aria-label="Reset filters"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};
