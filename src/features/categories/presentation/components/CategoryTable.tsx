"use client";

import Link from "next/link";
import { Edit2, Eye, SearchX, Tags } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { getCategoryInitials } from "../../domain/entities/category";
import type { CategoryDto } from "../../data/dto/category-dto";

export type CategoryTableProps = {
  categories: CategoryDto[];
  usageCounts?: Record<string, number>;
  isFiltered?: boolean;
  onClearFilters?: () => void;
};

export const CategoryTable = ({
  categories,
  usageCounts = {},
  isFiltered = false,
  onClearFilters,
}: CategoryTableProps) => {
  if (categories.length === 0) {
    if (isFiltered) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-muted">
            <SearchX size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            No matching categories
          </h3>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            No categories matched your search query or filter criteria.
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
          <Tags size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No categories yet
        </h3>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">
          Seed the standard categories or create your first category to organize products and services.
        </p>
        <Link
          href="/categories/new"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-light"
        >
          + Add Category
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[38%]">Category</TableHead>
            <TableHead className="w-[30%]">Description</TableHead>
            <TableHead className="w-[10%] text-center">Items</TableHead>
            <TableHead className="w-[12%] text-center">Status</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => {
            const isActive = c.status === "ACTIVE";
            const detailHref = `/categories/${c.id}`;
            const editHref = `/categories/${c.id}/edit`;
            const usage = usageCounts[c.name];

            return (
              <TableRow key={c.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface-alt text-xs font-semibold text-primary-light"
                      aria-hidden="true"
                    >
                      {getCategoryInitials(c.name)}
                    </div>
                    <Link
                      href={detailHref}
                      className="truncate text-sm font-medium text-text-primary group-hover:text-primary-light transition-colors hover:underline block"
                    >
                      {c.name}
                    </Link>
                  </div>
                </TableCell>

                <TableCell>
                  {c.description ? (
                    <span className="block truncate text-xs text-text-secondary max-w-xs">
                      {c.description}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
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
                      aria-label={`View details for ${c.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Eye size={13} />
                    </Link>
                    <Link
                      href={editHref}
                      aria-label={`Edit ${c.name}`}
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
