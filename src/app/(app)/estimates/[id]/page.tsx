import { notFound } from "next/navigation";
import { getEstimateById } from "@/features/estimates";
import { getInvoiceById } from "@/features/invoices/data/queries/get-invoice-by-id";
import { getSalesOrderById } from "@/features/sales-orders";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { EstimateDetailPage } from "@/features/estimates/presentation/page/EstimateDetailPage";

export const dynamic = "force-dynamic";

type EstimateDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

const EstimateDetailRoute = async ({ params }: EstimateDetailRouteProps) => {
  const resolvedParams = await params;
  const estimate = await getEstimateById(resolvedParams.id);

  if (!estimate) {
    notFound();
  }

  const [supplierTax, convertedInvoice, convertedSalesOrder] = await Promise.all([
    getSupplierTaxContext(),
    estimate.convertedToInvoiceId
      ? getInvoiceById(estimate.convertedToInvoiceId)
      : Promise.resolve(null),
    estimate.convertedToSalesOrderId
      ? getSalesOrderById(estimate.convertedToSalesOrderId)
      : Promise.resolve(null),
  ]);

  return (
    <EstimateDetailPage
      estimate={estimate}
      organizationName={supplierTax.organizationName}
      convertedInvoiceNumber={convertedInvoice?.number}
      convertedSalesOrderNumber={convertedSalesOrder?.orderNumber}
    />
  );
};

export default EstimateDetailRoute;
