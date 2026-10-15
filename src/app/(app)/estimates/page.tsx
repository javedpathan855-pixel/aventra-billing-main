import { getEstimates } from "@/features/estimates";
import { EstimateListPage } from "@/features/estimates/presentation/page/EstimateListPage";

export const dynamic = "force-dynamic";

export default async function EstimatesRoute() {
  const { estimates } = await getEstimates();
  return <EstimateListPage initialEstimates={estimates} />;
}
