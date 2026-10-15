import { getPricingOverview } from "@/features/pricing/data/queries/get-pricing";
import { getCategoryOptions } from "@/features/categories/data/queries/get-category-options";
import { PricingPage } from "@/features/pricing/presentation/page/PricingPage";

export const dynamic = "force-dynamic";

const PricingRoutePage = async () => {
  const [{ entries }, categoryOptions] = await Promise.all([
    getPricingOverview({ limit: 100 }),
    getCategoryOptions(),
  ]);

  return <PricingPage initialEntries={entries} categoryOptions={categoryOptions} />;
};

export default PricingRoutePage;
