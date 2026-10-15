"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SupplierForm } from "../forms/SupplierForm";
import type { SupplierDto } from "../../data/dto/supplier-dto";

export type SupplierCreatePageProps = {
  initialData?: SupplierDto | null;
  isEdit?: boolean;
};

export const SupplierCreatePage = ({
  initialData,
  isEdit = false,
}: SupplierCreatePageProps) => {
  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="space-y-1">
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Suppliers</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {isEdit ? "Edit Supplier" : "Add Supplier"}
        </h1>
        <p className="text-xs text-text-secondary">
          {isEdit
            ? "Update the supplier's details and settings."
            : "Create a supplier record for purchasing and vendor management."}
        </p>
      </div>

      {/* Main Form */}
      <SupplierForm initialData={initialData} isEdit={isEdit} />
    </div>
  );
};
