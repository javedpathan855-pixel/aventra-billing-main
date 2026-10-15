import { getProducts } from "@/features/products/data/queries/get-products";
import { getCategoryOptions } from "@/features/categories/data/queries/get-category-options";
import { ProductListPage } from "@/features/products/presentation/page/ProductListPage";

export const dynamic = "force-dynamic";

const ServicesPage = async () => {
  const [{ products }, categoryOptions] = await Promise.all([
    getProducts({ type: "SERVICE" }),
    getCategoryOptions(),
  ]);

  return <ProductListPage initialProducts={products} itemType="SERVICE" categoryOptions={categoryOptions} />;
};

export default ServicesPage;
