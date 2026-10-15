import { notFound } from "next/navigation";
import { getSalesOrderById } from "@/features/sales-orders";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { SalesOrderDetailPage } from "@/features/sales-orders/presentation/page/SalesOrderDetailPage";

export const dynamic = "force-dynamic";

type SalesOrderDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function SalesOrderDetailRoute({
  params,
}: SalesOrderDetailRouteProps) {
  const resolvedParams = await params;
  const order = await getSalesOrderById(resolvedParams.id);

  if (!order) {
    notFound();
  }

  const supplierTax = await getSupplierTaxContext();

  return (
    <SalesOrderDetailPage
      order={order}
      organizationName={supplierTax.organizationName}
    />
  );
}
