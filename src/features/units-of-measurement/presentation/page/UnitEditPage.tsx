import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { UnitDto } from "../../data/dto/unit-dto";
import { UnitForm } from "../forms/UnitForm";

export type UnitEditPageProps = {
  unit: UnitDto;
};

export const UnitEditPage = ({ unit }: UnitEditPageProps) => {
  return (
    <section className="space-y-6">
      <div>
        <Link
          href={`/units/${unit.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          <span>Back to Unit</span>
        </Link>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Edit {unit.code}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Update the unit name, precision, or availability.
        </p>
      </div>

      <UnitForm initialData={unit} isEdit />
    </section>
  );
};
