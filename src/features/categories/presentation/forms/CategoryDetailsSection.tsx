"use client";

import { Tags } from "lucide-react";
import { Input, Label, Select, Textarea } from "@/shared/components/form";
import type { CategoryStatus } from "../../domain/entities/category";

export type CategoryDetailsSectionProps = {
  name: string;
  onNameChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  status: CategoryStatus;
  onStatusChange: (val: CategoryStatus) => void;
  errors?: Record<string, string>;
};

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const CategoryDetailsSection = ({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  status,
  onStatusChange,
  errors = {},
}: CategoryDetailsSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
          <Tags size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Category Details
          </h2>
          <p className="text-xs text-text-secondary">
            Name, description, and availability for catalogue items.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category-name" className="text-xs">
            Category Name <span className="text-danger">*</span>
          </Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Hardware"
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
          <Label htmlFor="category-status" className="text-xs">
            Status <span className="text-danger">*</span>
          </Label>
          <Select
            id="category-status"
            value={status}
            onChange={(val) => onStatusChange(val as CategoryStatus)}
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
          <Label htmlFor="category-description" className="text-xs">
            Description
          </Label>
          <Textarea
            id="category-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="What belongs in this category..."
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
