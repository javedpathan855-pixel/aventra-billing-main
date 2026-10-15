import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CategoryForm } from "../forms/CategoryForm";

export const CategoryCreatePage = () => {
  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/categories"
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          <span>Back to Categories</span>
        </Link>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Add Category
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Create a shared category for products and services.
        </p>
      </div>

      <CategoryForm />
    </section>
  );
};
