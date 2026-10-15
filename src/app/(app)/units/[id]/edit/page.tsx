import { notFound } from "next/navigation";
import { getUnitById } from "@/features/units-of-measurement/data/queries/get-unit";
import { UnitEditPage } from "@/features/units-of-measurement/presentation/page/UnitEditPage";

export const dynamic = "force-dynamic";

const UnitEditRoutePage = async ({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) => {
  const resolvedParams = await params;
  const unit = await getUnitById(resolvedParams.id);

  if (!unit) {
    notFound();
  }

  return <UnitEditPage unit={unit} />;
};

export default UnitEditRoutePage;
