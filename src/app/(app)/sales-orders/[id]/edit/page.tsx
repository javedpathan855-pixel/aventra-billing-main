import { notFound, redirect } from "next/navigation";
import { getSalesOrderById } from "@/features/sales-orders";
import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getSalesSettings } from "@/features/sales-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { SalesOrderCreatePage } from "@/features/sales-orders/presentation/page/SalesOrderCreatePage";

export const dynamic = "force-dynamic";

type SalesOrderEditRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditSalesOrderRoute({
  params,
}: SalesOrderEditRouteProps) {
  const resolvedParams = await params;
  const order = await getSalesOrderById(resolvedParams.id);

  if (!order) {
    notFound();
  }

  // Only draft orders can be edited
  if (order.status !== "Draft") {
    redirect(`/sales-orders/${order.id}`);
  }

  const [{ customers }, { products }, salesSettings, supplierTax] =
    await Promise.all([
      getCustomers(),
      getProducts({ status: "ACTIVE" }),
      getSalesSettings(),
      getSupplierTaxContext(),
    ]);

  return (
    <SalesOrderCreatePage
      initialOrder={order}
      initialCustomers={customers}
      initialProducts={products}
      salesSettings={salesSettings}
      supplierState={supplierTax.state}
      supplierGstin={supplierTax.gstNumber}
      supplierName={supplierTax.organizationName}
    />
  );
}
