"use client";

import { SearchX, Tags } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import type { HsnSacCodeDto } from "../../data/dto/hsn-sac-dto";

export type HsnSacTableProps = {
  codes: HsnSacCodeDto[];
  isFiltered?: boolean;
  onClearFilters?: () => void;
};

export const HsnSacTable = ({
  codes,
  isFiltered = false,
  onClearFilters,
}: HsnSacTableProps) => {
  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-muted">
          {isFiltered ? <SearchX size={24} /> : <Tags size={24} />}
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          {isFiltered ? "No matching codes" : "No classification data yet"}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">
          {isFiltered
            ? "No HSN or SAC codes matched your search query."
            : "The classification master has not been imported yet. An authorized operator can load HSN_SAC.xlsx with the documented import script."}
        </p>
        {isFiltered && onClearFilters && (
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
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12%]">Type</TableHead>
            <TableHead className="w-[16%]">Code</TableHead>
            <TableHead className="w-[62%]">Description</TableHead>
            <TableHead className="w-[10%] text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-border/70 bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-secondary">
                  {c.type}
                </span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-text-primary">{c.code}</span>
              </TableCell>
              <TableCell>
                <span className="block text-xs text-text-secondary">{c.description}</span>
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.isActive
                      ? "bg-success/15 text-success"
                      : "bg-surface-alt text-text-muted border border-border/80"
                  }`}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
