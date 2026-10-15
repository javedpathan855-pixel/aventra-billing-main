import { notFound } from "next/navigation";
import { getCategoryById } from "@/features/categories/data/queries/get-category";
import { CategoryEditPage } from "@/features/categories/presentation/page/CategoryEditPage";

export const dynamic = "force-dynamic";

const CategoryEditRoutePage = async ({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) => {
  const resolvedParams = await params;
  const category = await getCategoryById(resolvedParams.id);

  if (!category) {
    notFound();
  }

  return <CategoryEditPage category={category} />;
};

export default CategoryEditRoutePage;
