import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getPurchaseOrders } from "@/features/purchase-orders";
import { getPurchaseSettings } from "@/features/purchase-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseBillCreatePage } from "@/features/purchase-bills/presentation/page/PurchaseBillCreatePage";

export const dynamic = "force-dynamic";

export default async function NewPurchaseBillPage() {
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
      initialSuppliers={suppliers}
      initialProducts={products}
      initialPurchaseOrders={orders}
      purchaseSettings={purchaseSettings}
      organizationState={supplierTax.state}
      organizationName={supplierTax.organizationName}
    />
  );
}
