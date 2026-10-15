import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { UnitForm } from "../forms/UnitForm";

export const UnitCreatePage = () => {
  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/units"
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          <span>Back to Units</span>
        </Link>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Add Unit
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Define a unit of measurement for quantities and billing.
        </p>
      </div>

      <UnitForm />
    </section>
  );
};
