"use client";

import Link from "next/link";
import { Edit2, Eye, SearchX, Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table";
import { Button } from "@/shared/components/form";
import { Avatar } from "@/shared/components/Avatar";
import { formatSupplierAddress, getSupplierInitials } from "../../domain/entities/supplier";
import type { SupplierDto } from "../../data/dto/supplier-dto";

export type SupplierTableProps = {
  suppliers: SupplierDto[];
  isFiltered?: boolean;
  onClearFilters?: () => void;
};

export const SupplierTable = ({
  suppliers,
  isFiltered = false,
  onClearFilters,
}: SupplierTableProps) => {
  if (suppliers.length === 0) {
    if (isFiltered) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-muted">
            <SearchX size={24} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-text-primary">
            No matching suppliers
          </h3>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            No supplier records matched your search query or filter criteria.
          </p>
          {onClearFilters && (
            <Button
              type="button"
              variant="secondary"
              onClick={onClearFilters}
              className="mt-4 h-9 px-4 text-xs"
            >
              Clear filters
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-card p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-text-muted">
          <Truck size={24} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-text-primary">
          No suppliers yet
        </h3>
        <p className="mt-1 max-w-sm text-sm text-text-secondary">
          Get started by creating your first supplier profile for purchase management.
        </p>
        <Link
          href="/suppliers/new"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-light"
        >
          Add Supplier
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%]">Supplier</TableHead>
            <TableHead className="w-[22%]">Contact</TableHead>
            <TableHead className="w-[18%]">Location</TableHead>
            <TableHead className="w-[14%]">GSTIN / Tax ID</TableHead>
            <TableHead className="w-[10%] text-center">Status</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((sup) => {
            const initials = getSupplierInitials(sup.name);
            const isActive = sup.status === "ACTIVE";

            return (
              <TableRow key={sup.id} className="group">
                {/* Supplier Identity */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar
                      label={initials}
                      className="h-9 w-9 bg-surface-alt text-xs font-bold text-primary-light border border-border/80"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/suppliers/${sup.id}`}
                        className="truncate text-sm font-medium text-text-primary group-hover:text-primary-light transition-colors hover:underline block"
                      >
                        {sup.name}
                      </Link>
                      <p className="truncate text-xs text-text-muted">
                        {sup.email || sup.phone || "No direct contact"}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Contact Person & Phone */}
                <TableCell>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text-primary">
                      {sup.contactPerson || "—"}
                    </p>
                    {sup.phone && (
                      <p className="truncate text-xs text-text-muted">
                        {sup.phone}
                      </p>
                    )}
                  </div>
                </TableCell>

                {/* Location */}
                <TableCell>
                  <p className="truncate text-sm text-text-primary">
                    {sup.billingAddress.city || "—"}
                    {sup.billingAddress.state ? `, ${sup.billingAddress.state}` : ""}
                  </p>
                  <p
                    className="truncate text-xs text-text-muted"
                    title={formatSupplierAddress(sup.billingAddress)}
                  >
                    {formatSupplierAddress(sup.billingAddress) || "No address"}
                  </p>
                </TableCell>

                {/* GSTIN */}
                <TableCell>
                  {sup.gstin ? (
                    <span className="font-mono text-xs text-text-primary">
                      {sup.gstin}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">Unregistered</span>
                  )}
                </TableCell>

                {/* Status */}
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

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/suppliers/${sup.id}`}
                      aria-label={`View details for ${sup.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:border-text-muted hover:bg-surface-alt hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <Eye size={13} />
                    </Link>
                    <Link
                      href={`/suppliers/${sup.id}/edit`}
                      aria-label={`Edit ${sup.name}`}
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
