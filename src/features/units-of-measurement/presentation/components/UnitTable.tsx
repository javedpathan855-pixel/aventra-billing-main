"use client";

import Link from "next/link";
import { Boxes, Edit2, Eye, SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import type { UnitDto } from "../../data/dto/unit-dto";

export type UnitTableProps = {
  units: UnitDto[];
  usageCounts?: Record<string, number>;
  isFiltered?: boolean;
  onClearFilters?: () => void;
};

export const UnitTable = ({
  units,
  usageCounts = {},
  isFiltered = false,
  onClearFilters,
}: UnitTableProps) => {
  if (units.length === 0) {
    if (isFiltered) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-muted">
            <SearchX size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            No matching units
          </h3>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            No units matched your search query or filter criteria.
          </p>
          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface-alt px-4 text-xs font-medium text-text-primary transition-colors hover:border-text-muted hover:bg-surface cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-muted">
          <Boxes size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No units yet
        </h3>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">
          Seed the standard units or create your first unit of measurement.
        </p>
        <Link
          href="/units/new"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-light"
        >
          + Add Unit
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[14%]">Code</TableHead>
            <TableHead className="w-[22%]">Unit</TableHead>
            <TableHead className="w-[30%]">Description</TableHead>
            <TableHead className="w-[10%] text-center">Precision</TableHead>
            <TableHead className="w-[8%] text-center">Items</TableHead>
            <TableHead className="w-[10%] text-center">Status</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((u) => {
            const isActive = u.status === "ACTIVE";
            const detailHref = `/units/${u.id}`;
            const editHref = `/units/${u.id}/edit`;
            const usage = usageCounts[u.code];

            return (
              <TableRow key={u.id} className="group">
                <TableCell>
                  <span className="inline-flex items-center rounded-md border border-border/70 bg-surface-alt px-2 py-0.5 font-mono text-xs text-text-primary">
                    {u.code}
                  </span>
                </TableCell>

                <TableCell>
                  <Link
                    href={detailHref}
                    className="truncate text-sm font-medium text-text-primary group-hover:text-primary-light transition-colors hover:underline block"
                  >
                    {u.name}
                  </Link>
                </TableCell>

                <TableCell>
                  {u.description ? (
                    <span className="block truncate text-xs text-text-secondary max-w-xs">
                      {u.description}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-xs font-mono text-text-secondary">
                    {u.precision} dp
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-xs font-mono text-text-secondary">
                    {usage === undefined ? "—" : usage}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isActive
                        ? "bg-success/15 text-success"
                        : "bg-surface-alt text-text-muted border border-border/80"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-success" : "bg-text-muted"
                      }`}
                      aria-hidden="true"
                    />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={detailHref}
                      aria-label={`View details for ${u.code}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Eye size={13} />
                    </Link>
                    <Link
                      href={editHref}
                      aria-label={`Edit ${u.code}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Edit2 size={13} />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
