import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getSalesSettings } from "@/features/sales-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { getEstimateById } from "@/features/estimates";
import { SalesOrderCreatePage } from "@/features/sales-orders/presentation/page/SalesOrderCreatePage";

export const dynamic = "force-dynamic";

type NewSalesOrderPageProps = {
  searchParams: Promise<{ fromEstimateId?: string }>;
};

export default async function NewSalesOrderPage({
  searchParams,
}: NewSalesOrderPageProps) {
  const { fromEstimateId } = await searchParams;

  const [{ customers }, { products }, salesSettings, supplierTax, fromEstimate] =
    await Promise.all([
      getCustomers(),
      getProducts({ status: "ACTIVE" }),
      getSalesSettings(),
      getSupplierTaxContext(),
      fromEstimateId ? getEstimateById(fromEstimateId) : Promise.resolve(null),
    ]);

  return (
    <SalesOrderCreatePage
      initialCustomers={customers}
      initialProducts={products}
      salesSettings={salesSettings}
      supplierState={supplierTax.state}
      supplierGstin={supplierTax.gstNumber}
      supplierName={supplierTax.organizationName}
      fromEstimate={fromEstimate ?? undefined}
    />
  );
}
