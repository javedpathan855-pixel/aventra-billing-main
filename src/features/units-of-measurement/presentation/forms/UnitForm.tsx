"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/shared/components/form/Button";
import type { CreateUnitInput, UnitDto } from "../../data/dto/unit-dto";
import type { UnitStatus } from "../../domain/entities/unit";
import { createUnitAction } from "../../data/mutations/create-unit";
import { updateUnitAction } from "../../data/mutations/update-unit";
import { UnitDetailsSection } from "./UnitDetailsSection";

export type UnitFormProps = {
  initialData?: UnitDto | null;
  isEdit?: boolean;
};

export const UnitForm = ({ initialData, isEdit = false }: UnitFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [precision, setPrecision] = useState(
    initialData?.precision !== undefined ? String(initialData.precision) : "3",
  );
  const [status, setStatus] = useState<UnitStatus>(initialData?.status || "ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (name.trim().length < 2) {
      setFieldErrors({ name: "Unit name must be at least 2 characters." });
      return;
    }
    if (code.trim().length < 1) {
      setFieldErrors({ code: "Unit code is required." });
      return;
    }

    const payload: CreateUnitInput & { status?: UnitStatus } = {
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || null,
      precision: parseInt(precision, 10),
      ...(isEdit ? { status } : {}),
    };

    startTransition(async () => {
      if (isEdit && initialData) {
        const result = await updateUnitAction(initialData.id, payload);
        if (!result.success) {
          setFormError(result.error || "Failed to update unit.");
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        router.push(`/units/${initialData.id}?saved=1`);
      } else {
        const result = await createUnitAction(payload);
        if (!result.success) {
          setFormError(result.error || "Failed to create unit.");
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }
        router.push("/units?saved=1");
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

      <UnitDetailsSection
        name={name}
        onNameChange={setName}
        code={code}
        onCodeChange={setCode}
        description={description}
        onDescriptionChange={setDescription}
        precision={precision}
        onPrecisionChange={setPrecision}
        status={status}
        onStatusChange={setStatus}
        errors={fieldErrors}
      />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/units"
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
              <span>Create Unit</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
