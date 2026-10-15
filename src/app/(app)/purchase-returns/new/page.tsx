import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getPurchaseOrders } from "@/features/purchase-orders";
import { getReturnableBills } from "@/features/purchase-returns";
import { getPurchaseSettings } from "@/features/purchase-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseReturnCreatePage } from "@/features/purchase-returns/presentation/page/PurchaseReturnCreatePage";

export const dynamic = "force-dynamic";

export default async function NewPurchaseReturnPage() {
  const [
    { suppliers },
    { products },
    { orders },
    returnableBills,
    purchaseSettings,
    supplierTax,
  ] = await Promise.all([
    getSuppliers({ status: "ACTIVE", page: 1, pageSize: 100 }),
    getProducts({ status: "ACTIVE" }),
    getPurchaseOrders({ page: 1, pageSize: 100 }),
    getReturnableBills(),
    getPurchaseSettings(),
    getSupplierTaxContext(),
  ]);

  return (
    <PurchaseReturnCreatePage
      initialSuppliers={suppliers}
      initialProducts={products}
      initialReturnableBills={returnableBills}
      initialPurchaseOrders={orders}
      purchaseSettings={purchaseSettings}
      organizationState={supplierTax.state}
      organizationName={supplierTax.organizationName}
    />
  );
}
