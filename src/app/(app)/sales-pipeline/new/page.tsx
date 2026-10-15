import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { OpportunityCreatePage } from "@/features/sales-pipeline/presentation/page/OpportunityCreatePage";

export const dynamic = "force-dynamic";

export default async function NewSalesOpportunityPage() {
  const { customers } = await getCustomers();

  return <OpportunityCreatePage customers={customers} />;
}
