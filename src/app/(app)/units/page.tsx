import { getUnits } from "@/features/units-of-measurement/data/queries/get-units";
import { countUnitsUsage } from "@/features/units-of-measurement/data/queries/get-unit-usage";
import { unitFilterSchema } from "@/features/units-of-measurement/data/validators/unit-schemas";
import { UnitListPage } from "@/features/units-of-measurement/presentation/page/UnitListPage";

export const dynamic = "force-dynamic";

type SearchParams = {
  query?: string;
  status?: string;
  page?: string;
  saved?: string;
};

const UnitsPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const raw = await searchParams;
  const parsed = unitFilterSchema.safeParse({
    query: raw.query,
    status: raw.status,
    page: raw.page,
  });

  const filter = parsed.success
    ? parsed.data
    : { query: undefined, status: "ALL" as const, page: 1, pageSize: 10 };

  const { units, totalCount } = await getUnits(filter);
  const usageCounts = await countUnitsUsage(units.map((u) => u.code));

  return (
    <UnitListPage
      key={`${filter.query ?? ""}|${filter.status}|${filter.page}`}
      initialUnits={units}
      totalCount={totalCount}
      usageCounts={usageCounts}
      initialQuery={filter.query ?? ""}
      initialStatus={filter.status}
      initialPage={filter.page}
      pageSize={filter.pageSize}
      showSavedBanner={raw.saved === "1"}
    />
  );
};

export default UnitsPage;
