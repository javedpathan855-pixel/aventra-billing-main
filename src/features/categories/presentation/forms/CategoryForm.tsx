"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/shared/components/form/Button";
import type { CategoryDto, CreateCategoryInput } from "../../data/dto/category-dto";
import type { CategoryStatus } from "../../domain/entities/category";
import { createCategoryAction } from "../../data/mutations/create-category";
import { updateCategoryAction } from "../../data/mutations/update-category";
import { CategoryDetailsSection } from "./CategoryDetailsSection";

export type CategoryFormProps = {
  initialData?: CategoryDto | null;
  isEdit?: boolean;
};

export const CategoryForm = ({ initialData, isEdit = false }: CategoryFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [status, setStatus] = useState<CategoryStatus>(initialData?.status || "ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (name.trim().length < 2) {
      setFieldErrors({ name: "Category name must be at least 2 characters." });
      return;
    }

    const payload: CreateCategoryInput & { status?: CategoryStatus } = {
      name: name.trim(),
      description: description.trim() || null,
      ...(isEdit ? { status } : {}),
    };

    startTransition(async () => {
      if (isEdit && initialData) {
        const result = await updateCategoryAction(initialData.id, payload);
        if (!result.success) {
          setFormError(result.error || "Failed to update category.");
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        router.push(`/categories/${initialData.id}?saved=1`);
      } else {
        const result = await createCategoryAction(payload);
        if (!result.success) {
          setFormError(result.error || "Failed to create category.");
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        router.push("/categories?saved=1");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {formError && (
        <div
          className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger flex items-center justify-between"
          role="alert"
        >
          <span>{formError}</span>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="text-danger hover:opacity-80"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <CategoryDetailsSection
        name={name}
        onNameChange={setName}
        description={description}
        onDescriptionChange={setDescription}
        status={status}
        onStatusChange={setStatus}
        errors={fieldErrors}
      />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/categories"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
        >
          <X size={15} />
          <span>Cancel</span>
        </Link>

        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="h-10 px-5 text-sm shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : isEdit ? (
            <>
              <Check size={16} />
              <span>Save Changes</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Create Category</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
