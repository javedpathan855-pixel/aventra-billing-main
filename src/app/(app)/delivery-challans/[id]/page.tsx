import { notFound } from "next/navigation";
import { getDeliveryChallanById } from "@/features/delivery-challans";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { DeliveryChallanDetailPage } from "@/features/delivery-challans/presentation/page/DeliveryChallanDetailPage";

export const dynamic = "force-dynamic";

type DeliveryChallanDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function DeliveryChallanDetailRoute({
  params,
}: DeliveryChallanDetailRouteProps) {
  const { id } = await params;

  const [challan, supplierTax] = await Promise.all([
    getDeliveryChallanById(id),
    getSupplierTaxContext(),
  ]);

  if (!challan) {
    notFound();
  }

  return (
    <DeliveryChallanDetailPage
      challan={challan}
      organizationName={supplierTax.organizationName}
      organizationGstin={supplierTax.gstNumber}
    />
  );
}
