import { ProductCreatePage } from "@/features/products/presentation/page/ProductCreatePage";
import { getCategoryOptions } from "@/features/categories/data/queries/get-category-options";
import { getUnitOptions } from "@/features/units-of-measurement/data/queries/get-unit-options";

export const dynamic = "force-dynamic";

const NewProductPage = async () => {
  const [categoryOptions, unitOptions] = await Promise.all([
    getCategoryOptions(),
    getUnitOptions(),
  ]);

  return (
    <ProductCreatePage
      type="PRODUCT"
      categoryOptions={categoryOptions}
      unitOptions={unitOptions.map((u) => u.code)}
    />
  );
};

export default NewProductPage;
