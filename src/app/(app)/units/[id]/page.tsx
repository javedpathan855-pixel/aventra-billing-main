import { notFound } from "next/navigation";
import { getUnitById } from "@/features/units-of-measurement/data/queries/get-unit";
import { countUnitUsage } from "@/features/units-of-measurement/data/queries/get-unit-usage";
import { getProducts } from "@/features/products/data/queries/get-products";
import { UnitDetailPage } from "@/features/units-of-measurement/presentation/page/UnitDetailPage";

export const dynamic = "force-dynamic";

const UnitDetailRoutePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ saved?: string }>;
}) => {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const unit = await getUnitById(resolvedParams.id);

  if (!unit) {
    notFound();
  }

  const usageCount = await countUnitUsage(unit.code);
  const { products } = await getProducts({ unit: unit.code, limit: 20 });

  return (
    <UnitDetailPage
      unit={unit}
      usageCount={usageCount}
      items={products}
      showSavedBanner={resolvedSearch.saved === "1"}
    />
  );
};

export default UnitDetailRoutePage;
