import { notFound } from "next/navigation";
import { getSalesReturnById } from "@/features/sales-returns";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { SalesReturnDetailPage } from "@/features/sales-returns/presentation/page/SalesReturnDetailPage";

export const dynamic = "force-dynamic";

type SalesReturnDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function SalesReturnDetailRoute({
  params,
}: SalesReturnDetailRouteProps) {
  const { id } = await params;

  const [salesReturn, supplierTax] = await Promise.all([
    getSalesReturnById(id),
    getSupplierTaxContext(),
  ]);

  if (!salesReturn) {
    notFound();
  }

  return (
    <SalesReturnDetailPage
      salesReturn={salesReturn}
      organizationName={supplierTax.organizationName}
      organizationGstin={supplierTax.gstNumber}
    />
  );
}
