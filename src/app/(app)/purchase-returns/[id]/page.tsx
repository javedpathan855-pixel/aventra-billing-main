import { notFound } from "next/navigation";
import { getPurchaseReturnById } from "@/features/purchase-returns";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseReturnDetailPage } from "@/features/purchase-returns/presentation/page/PurchaseReturnDetailPage";

export const dynamic = "force-dynamic";

type PurchaseReturnDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function PurchaseReturnDetailRoute({
  params,
}: PurchaseReturnDetailRouteProps) {
  const resolvedParams = await params;
  const purchaseReturn = await getPurchaseReturnById(resolvedParams.id);

  if (!purchaseReturn) {
    notFound();
  }

  const supplierTax = await getSupplierTaxContext();

  return (
    <PurchaseReturnDetailPage
      purchaseReturn={purchaseReturn}
      organizationName={supplierTax.organizationName}
    />
  );
}
