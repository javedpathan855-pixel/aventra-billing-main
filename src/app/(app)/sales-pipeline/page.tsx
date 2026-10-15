import { getSalesOpportunities, getOpportunityMetrics } from "@/features/sales-pipeline";
import { SalesPipelinePage } from "@/features/sales-pipeline/presentation/page/SalesPipelinePage";

export const dynamic = "force-dynamic";

export default async function SalesPipelineRoute() {
  const [opportunities, metrics] = await Promise.all([
    getSalesOpportunities(),
    getOpportunityMetrics(),
  ]);

  return (
    <SalesPipelinePage
      initialOpportunities={opportunities}
      initialMetrics={metrics}
    />
  );
}
