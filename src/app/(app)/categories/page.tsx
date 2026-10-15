import { getCategories } from "@/features/categories/data/queries/get-categories";
import { countCategoriesUsage } from "@/features/categories/data/queries/get-category-usage";
import { categoryFilterSchema } from "@/features/categories/data/validators/category-schemas";
import { CategoryListPage } from "@/features/categories/presentation/page/CategoryListPage";

export const dynamic = "force-dynamic";

type SearchParams = {
  query?: string;
  status?: string;
  page?: string;
  saved?: string;
};

const CategoriesPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const raw = await searchParams;
  const parsed = categoryFilterSchema.safeParse({
    query: raw.query,
    status: raw.status,
    page: raw.page,
  });

  const filter = parsed.success
    ? parsed.data
    : { query: undefined, status: "ALL" as const, page: 1, pageSize: 10 };

  const { categories, totalCount } = await getCategories(filter);
  const usageCounts = await countCategoriesUsage(categories.map((c) => c.name));

  return (
    <CategoryListPage
      key={`${filter.query ?? ""}|${filter.status}|${filter.page}`}
      initialCategories={categories}
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

export default CategoriesPage;
