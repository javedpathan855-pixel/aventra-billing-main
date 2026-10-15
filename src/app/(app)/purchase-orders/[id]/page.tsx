import { notFound } from "next/navigation";
import { getPurchaseOrderById } from "@/features/purchase-orders";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseOrderDetailPage } from "@/features/purchase-orders/presentation/page/PurchaseOrderDetailPage";

export const dynamic = "force-dynamic";

type PurchaseOrderDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function PurchaseOrderDetailRoute({
  params,
}: PurchaseOrderDetailRouteProps) {
  const resolvedParams = await params;
  const order = await getPurchaseOrderById(resolvedParams.id);

  if (!order) {
    notFound();
  }

  const supplierTax = await getSupplierTaxContext();

  return (
    <PurchaseOrderDetailPage
      order={order}
      organizationName={supplierTax.organizationName}
    />
  );
}
