"use client";

import { Boxes } from "lucide-react";
import { Input, Label, Select, Textarea } from "@/shared/components/form";
import type { UnitStatus } from "../../domain/entities/unit";

export type UnitDetailsSectionProps = {
  name: string;
  onNameChange: (val: string) => void;
  code: string;
  onCodeChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  precision: string;
  onPrecisionChange: (val: string) => void;
  status: UnitStatus;
  onStatusChange: (val: UnitStatus) => void;
  errors?: Record<string, string>;
};

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const precisionOptions = [
  { value: "0", label: "0 — whole numbers only" },
  { value: "1", label: "1 decimal place" },
  { value: "2", label: "2 decimal places" },
  { value: "3", label: "3 decimal places" },
];

export const UnitDetailsSection = ({
  name,
  onNameChange,
  code,
  onCodeChange,
  description,
  onDescriptionChange,
  precision,
  onPrecisionChange,
  status,
  onStatusChange,
  errors = {},
}: UnitDetailsSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
          <Boxes size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Unit Details
          </h2>
          <p className="text-xs text-text-secondary">
            Code, name, quantity precision, and availability.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="unit-code" className="text-xs">
            Unit Code <span className="text-danger">*</span>
          </Label>
          <Input
            id="unit-code"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            placeholder="e.g., PCS"
            aria-invalid={Boolean(errors.code)}
            className="h-10 text-sm font-mono"
          />
          {errors.code && (
            <p className="text-xs text-danger" role="alert">
              {errors.code}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit-name" className="text-xs">
            Unit Name <span className="text-danger">*</span>
          </Label>
          <Input
            id="unit-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Pieces"
            aria-invalid={Boolean(errors.name)}
            className="h-10 text-sm"
          />
          {errors.name && (
            <p className="text-xs text-danger" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit-precision" className="text-xs">
            Quantity Precision <span className="text-danger">*</span>
          </Label>
          <Select
            id="unit-precision"
            value={precision}
            onChange={onPrecisionChange}
            options={precisionOptions}
            className="h-10 text-sm"
          />
          {errors.precision && (
            <p className="text-xs text-danger" role="alert">
              {errors.precision}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unit-status" className="text-xs">
            Status <span className="text-danger">*</span>
          </Label>
          <Select
            id="unit-status"
            value={status}
            onChange={(val) => onStatusChange(val as UnitStatus)}
            options={statusOptions}
            className="h-10 text-sm"
          />
          {errors.status && (
            <p className="text-xs text-danger" role="alert">
              {errors.status}
            </p>
          )}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="unit-description" className="text-xs">
            Description
          </Label>
          <Textarea
            id="unit-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="When is this unit used..."
            rows={3}
            className="text-sm resize-none"
          />
          {errors.description && (
            <p className="text-xs text-danger" role="alert">
              {errors.description}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
