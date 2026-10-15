import { notFound } from "next/navigation";
import { getCategoryById } from "@/features/categories/data/queries/get-category";
import { countCategoryUsage } from "@/features/categories/data/queries/get-category-usage";
import { getProducts } from "@/features/products/data/queries/get-products";
import { CategoryDetailPage } from "@/features/categories/presentation/page/CategoryDetailPage";

export const dynamic = "force-dynamic";

const CategoryDetailRoutePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams: Promise<{ saved?: string }>;
}) => {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const category = await getCategoryById(resolvedParams.id);

  if (!category) {
    notFound();
  }

  const usageCount = await countCategoryUsage(category.name);
  const { products } = await getProducts({ category: category.name, limit: 20 });

  return (
    <CategoryDetailPage
      category={category}
      usageCount={usageCount}
      items={products}
      showSavedBanner={resolvedSearch.saved === "1"}
    />
  );
};

export default CategoryDetailRoutePage;
