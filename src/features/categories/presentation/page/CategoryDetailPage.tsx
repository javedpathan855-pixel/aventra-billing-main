"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, Edit2, Package, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { getCategoryInitials } from "../../domain/entities/category";
import type { CategoryDto } from "../../data/dto/category-dto";
import type { ProductDto } from "@/features/products/data/dto/product-dto";
import { deleteCategoryAction } from "../../data/mutations/delete-category";
import { updateCategoryAction } from "../../data/mutations/update-category";

export type CategoryDetailPageProps = {
  category: CategoryDto;
  usageCount: number;
  items: ProductDto[];
  showSavedBanner?: boolean;
};

export const CategoryDetailPage = ({
  category,
  usageCount,
  items,
  showSavedBanner = false,
}: CategoryDetailPageProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isActive = category.status === "ACTIVE";

  const handleStatusToggle = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await updateCategoryAction(category.id, {
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
      const result = await deleteCategoryAction(category.id);
      if (!result.success) {
        setActionError(result.error || "Failed to delete category.");
        setConfirmDelete(false);
        return;
      }
      router.push("/categories?saved=1");
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={14} />
            <span>Back to Categories</span>
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-surface-alt text-sm font-semibold text-primary-light"
              aria-hidden="true"
            >
              {getCategoryInitials(category.name)}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              {category.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/categories/${category.id}/edit`}
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
          <span>Category saved successfully.</span>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Catalogue items</p>
          <p className="mt-2 text-2xl font-bold text-text-primary tabular-nums">{usageCount}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Description</p>
          <p className="mt-2 text-sm text-text-secondary">
            {category.description || "No description provided."}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Items in this category</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Products and services currently assigned to {category.name}.
          </p>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-text-muted">
              <Package size={20} />
            </div>
            <p className="mt-3 text-sm font-medium text-text-primary">No items yet</p>
            <p className="mt-1 max-w-sm text-xs text-text-secondary">
              Assign this category from any product or service record.
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
        title={`Delete ${category.name}?`}
        description={
          usageCount > 0
            ? `This category is used by ${usageCount} item${usageCount === 1 ? "" : "s"}. Reassign those items before deleting.`
            : "This category is not used by any catalogue items. This action cannot be undone."
        }
        confirmLabel="Delete category"
        variant="danger"
        isConfirming={isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </section>
  );
};
