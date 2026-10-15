import { notFound } from "next/navigation";
import { getProductById } from "@/features/products/data/queries/get-product-by-id";
import { ProductEditPage } from "@/features/products/presentation/page/ProductEditPage";
import { getCategoryOptions } from "@/features/categories/data/queries/get-category-options";
import { getUnitOptions } from "@/features/units-of-measurement/data/queries/get-unit-options";

export const dynamic = "force-dynamic";

const ServiceEditRoutePage = async ({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) => {
  const resolvedParams = await params;
  const [product, categoryOptions, unitOptions] = await Promise.all([
    getProductById(resolvedParams.id),
    getCategoryOptions(),
    getUnitOptions(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <ProductEditPage
      product={product}
      categoryOptions={categoryOptions}
      unitOptions={unitOptions.map((u) => u.code)}
    />
  );
};

export default ServiceEditRoutePage;
