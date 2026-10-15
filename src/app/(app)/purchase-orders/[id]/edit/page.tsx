import { notFound, redirect } from "next/navigation";
import { getPurchaseOrderById } from "@/features/purchase-orders";
import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getPurchaseSettings } from "@/features/purchase-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseOrderCreatePage } from "@/features/purchase-orders/presentation/page/PurchaseOrderCreatePage";

export const dynamic = "force-dynamic";

type PurchaseOrderEditRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditPurchaseOrderRoute({
  params,
}: PurchaseOrderEditRouteProps) {
  const resolvedParams = await params;
  const order = await getPurchaseOrderById(resolvedParams.id);

  if (!order) {
    notFound();
  }

  // Only draft orders can be edited
  if (order.status !== "Draft") {
    redirect(`/purchase-orders/${order.id}`);
  }

  const [{ suppliers }, { products }, purchaseSettings, supplierTax] =
    await Promise.all([
      getSuppliers({ status: "ACTIVE", page: 1, pageSize: 100 }),
      getProducts({ status: "ACTIVE" }),
      getPurchaseSettings(),
      getSupplierTaxContext(),
    ]);

  return (
    <PurchaseOrderCreatePage
      initialOrder={order}
      initialSuppliers={suppliers}
      initialProducts={products}
      purchaseSettings={purchaseSettings}
      organizationState={supplierTax.state}
      organizationGstin={supplierTax.gstNumber}
      organizationName={supplierTax.organizationName}
    />
  );
}
