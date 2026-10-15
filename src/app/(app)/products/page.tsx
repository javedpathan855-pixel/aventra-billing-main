import { getProducts } from "@/features/products/data/queries/get-products";
import { getCategoryOptions } from "@/features/categories/data/queries/get-category-options";
import { ProductListPage } from "@/features/products/presentation/page/ProductListPage";

export const dynamic = "force-dynamic";

const ProductsPage = async () => {
  const [{ products }, categoryOptions] = await Promise.all([
    getProducts({ type: "PRODUCT" }),
    getCategoryOptions(),
  ]);

  return <ProductListPage initialProducts={products} itemType="PRODUCT" categoryOptions={categoryOptions} />;
};

export default ProductsPage;
