import { notFound, redirect } from "next/navigation";
import { getPurchaseBillById } from "@/features/purchase-bills";
import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getPurchaseOrders } from "@/features/purchase-orders";
import { getPurchaseSettings } from "@/features/purchase-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseBillCreatePage } from "@/features/purchase-bills/presentation/page/PurchaseBillCreatePage";

export const dynamic = "force-dynamic";

type PurchaseBillEditRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditPurchaseBillRoute({
  params,
}: PurchaseBillEditRouteProps) {
  const resolvedParams = await params;
  const bill = await getPurchaseBillById(resolvedParams.id);

  if (!bill) {
    notFound();
  }

  // Only draft bills can be edited
  if (bill.status !== "Draft") {
    redirect(`/purchase-bills/${bill.id}`);
  }

  const [{ suppliers }, { products }, { orders }, purchaseSettings, supplierTax] =
    await Promise.all([
      getSuppliers({ status: "ACTIVE", page: 1, pageSize: 100 }),
      getProducts({ status: "ACTIVE" }),
      getPurchaseOrders({ page: 1, pageSize: 100 }),
      getPurchaseSettings(),
      getSupplierTaxContext(),
    ]);

  return (
    <PurchaseBillCreatePage
      initialBill={bill}
      initialSuppliers={suppliers}
      initialProducts={products}
      initialPurchaseOrders={orders}
      purchaseSettings={purchaseSettings}
      organizationState={supplierTax.state}
      organizationName={supplierTax.organizationName}
    />
  );
}
