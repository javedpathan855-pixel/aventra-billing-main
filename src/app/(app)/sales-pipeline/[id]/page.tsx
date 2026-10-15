import { notFound } from "next/navigation";
import { getSalesOpportunityById } from "@/features/sales-pipeline";
import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { OpportunityDetailPage } from "@/features/sales-pipeline/presentation/page/OpportunityDetailPage";

export const dynamic = "force-dynamic";

interface SalesOpportunityDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function SalesOpportunityDetailRoute({
  params,
}: SalesOpportunityDetailRouteProps) {
  const { id } = await params;

  const [opportunity, { customers }] = await Promise.all([
    getSalesOpportunityById(id),
    getCustomers(),
  ]);

  if (!opportunity) {
    notFound();
  }

  return (
    <OpportunityDetailPage
      initialOpportunity={opportunity}
      customers={customers}
    />
  );
}
