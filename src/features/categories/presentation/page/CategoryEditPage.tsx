import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { CategoryDto } from "../../data/dto/category-dto";
import { CategoryForm } from "../forms/CategoryForm";

export type CategoryEditPageProps = {
  category: CategoryDto;
};

export const CategoryEditPage = ({ category }: CategoryEditPageProps) => {
  return (
    <section className="space-y-6">
      <div>
        <Link
          href={`/categories/${category.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          <span>Back to Category</span>
        </Link>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Edit {category.name}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Update the category name, description, or availability.
        </p>
      </div>

      <CategoryForm initialData={category} isEdit />
    </section>
  );
};
