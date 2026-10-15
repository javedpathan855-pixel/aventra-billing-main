import { searchHsnSacCodes } from "@/features/hsn-sac-mapping/data/queries/search-hsn-sac-codes";
import { getHsnSacImportStatus } from "@/features/hsn-sac-mapping/data/queries/get-hsn-sac-import-status";
import { getMappedClassifications } from "@/features/hsn-sac-mapping/data/queries/get-mapped-classifications";
import { hsnSacFilterSchema } from "@/features/hsn-sac-mapping/data/validators/hsn-sac-schemas";
import { HsnSacMappingPage } from "@/features/hsn-sac-mapping/presentation/page/HsnSacMappingPage";

export const dynamic = "force-dynamic";

type SearchParams = {
  query?: string;
  type?: string;
  page?: string;
};

const HsnSacPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const raw = await searchParams;
  const parsed = hsnSacFilterSchema.safeParse({
    query: raw.query,
    type: raw.type,
    page: raw.page,
  });

  const filter = parsed.success
    ? parsed.data
    : { query: undefined, type: "ALL" as const, page: 1, pageSize: 20 };

  const [{ codes, totalCount }, importStatus, mapped] = await Promise.all([
    searchHsnSacCodes(filter),
    getHsnSacImportStatus(),
    getMappedClassifications(),
  ]);

  return (
    <HsnSacMappingPage
      key={`${filter.query ?? ""}|${filter.type}|${filter.page}`}
      initialCodes={codes}
      totalCount={totalCount}
      importStatus={importStatus}
      mapped={mapped}
      initialQuery={filter.query ?? ""}
      initialType={filter.type}
      initialPage={filter.page}
      pageSize={filter.pageSize}
    />
  );
};

export default HsnSacPage;
