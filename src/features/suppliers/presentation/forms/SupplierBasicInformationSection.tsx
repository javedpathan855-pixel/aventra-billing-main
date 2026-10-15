"use client";

import { Building2 } from "lucide-react";
import { Input, Label, Select } from "@/shared/components/form";
import type { SupplierStatus } from "../../domain/entities/supplier";

export type SupplierBasicInformationSectionProps = {
  name: string;
  onNameChange: (val: string) => void;
  status: SupplierStatus;
  onStatusChange: (val: SupplierStatus) => void;
  error?: string;
};

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const SupplierBasicInformationSection = ({
  name,
  onNameChange,
  status,
  onStatusChange,
  error,
}: SupplierBasicInformationSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
          <Building2 size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Basic Information
          </h2>
          <p className="text-xs text-text-secondary">
            Enter the supplier&apos;s basic details.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Supplier Name */}
        <div className="space-y-1.5">
          <Label htmlFor="supplier-name" className="text-xs">
            Supplier Name <span className="text-danger">*</span>
          </Label>
          <Input
            id="supplier-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter supplier name..."
            aria-invalid={Boolean(error)}
            className="h-10 text-sm"
          />
          {error && (
            <p className="text-xs text-danger" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label htmlFor="supplier-status" className="text-xs">
            Status <span className="text-danger">*</span>
          </Label>
          <Select
            id="supplier-status"
            value={status}
            onChange={(val) => onStatusChange(val as SupplierStatus)}
            options={statusOptions}
            startIcon={
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "ACTIVE" ? "bg-success" : "bg-text-muted"
                }`}
              />
            }
            className="h-10 text-sm"
          />
        </div>
      </div>
    </section>
  );
};
