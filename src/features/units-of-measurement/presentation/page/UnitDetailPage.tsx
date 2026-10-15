"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, Edit2, Package, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import type { UnitDto } from "../../data/dto/unit-dto";
import type { ProductDto } from "@/features/products/data/dto/product-dto";
import { deleteUnitAction } from "../../data/mutations/delete-unit";
import { updateUnitAction } from "../../data/mutations/update-unit";

export type UnitDetailPageProps = {
  unit: UnitDto;
  usageCount: number;
  items: ProductDto[];
  showSavedBanner?: boolean;
};

export const UnitDetailPage = ({
  unit,
  usageCount,
  items,
  showSavedBanner = false,
}: UnitDetailPageProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isActive = unit.status === "ACTIVE";

  const handleStatusToggle = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await updateUnitAction(unit.id, {
        status: isActive ? "INACTIVE" : "ACTIVE",
      });
      if (!result.success) {
        setActionError(result.error || "Failed to update status.");
        return;
      }
      router.refresh();
    });
  };

  const handleDelete = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await deleteUnitAction(unit.id);
      if (!result.success) {
        setActionError(result.error || "Failed to delete unit.");
        setConfirmDelete(false);
        return;
      }
      router.push("/units?saved=1");
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/units"
            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={14} />
            <span>Back to Units</span>
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center rounded-md border border-border/70 bg-surface-alt px-2.5 py-1 font-mono text-sm text-text-primary">
              {unit.code}
            </span>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              {unit.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/units/${unit.id}/edit`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-xs font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-4 text-xs font-medium text-danger transition-colors hover:bg-danger/20 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {showSavedBanner && (
        <div
          className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success"
          role="status"
        >
          <CheckCircle2 size={16} />
          <span>Unit saved successfully.</span>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Status</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive
                  ? "bg-success/15 text-success"
                  : "bg-surface-alt text-text-muted border border-border/80"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </span>
            <button
              type="button"
              onClick={handleStatusToggle}
              disabled={isPending}
              className="text-xs font-medium text-primary-light hover:underline disabled:opacity-60 cursor-pointer"
            >
              {isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Precision</p>
          <p className="mt-2 text-2xl font-bold text-text-primary tabular-nums">
            {unit.precision} <span className="text-sm font-medium text-text-muted">dp</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Catalogue items</p>
          <p className="mt-2 text-2xl font-bold text-text-primary tabular-nums">{usageCount}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Description</p>
          <p className="mt-2 text-sm text-text-secondary">
            {unit.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Items using this unit</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Products and services currently measured in {unit.code}.
          </p>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-text-muted">
              <Package size={20} />
            </div>
            <p className="mt-3 text-sm font-medium text-text-primary">No items yet</p>
            <p className="mt-1 max-w-sm text-xs text-text-secondary">
              Assign this unit from any product or service record.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-muted">
                    {item.type === "PRODUCT" ? "Product" : "Service"}
                    {item.sku ? ` · ${item.sku}` : ""}
                  </p>
                </div>
                <Link
                  href={item.type === "PRODUCT" ? `/products/${item.id}` : `/services/${item.id}`}
                  className="shrink-0 text-xs font-medium text-primary-light hover:underline"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${unit.code}?`}
        description={
          usageCount > 0
            ? `This unit is used by ${usageCount} item${usageCount === 1 ? "" : "s"}. Reassign those items before deleting.`
            : "This unit is not used by any catalogue items. Historical documents keep their stored unit labels. This action cannot be undone."
        }
        confirmLabel="Delete unit"
        variant="danger"
        isConfirming={isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </section>
  );
};
