import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getPurchaseSettings } from "@/features/purchase-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseOrderCreatePage } from "@/features/purchase-orders/presentation/page/PurchaseOrderCreatePage";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const [{ suppliers }, { products }, purchaseSettings, supplierTax] =
    await Promise.all([
      getSuppliers({ status: "ACTIVE", page: 1, pageSize: 100 }),
      getProducts({ status: "ACTIVE" }),
      getPurchaseSettings(),
      getSupplierTaxContext(),
    ]);

  return (
    <PurchaseOrderCreatePage
      initialSuppliers={suppliers}
      initialProducts={products}
      purchaseSettings={purchaseSettings}
      organizationState={supplierTax.state}
      organizationGstin={supplierTax.gstNumber}
      organizationName={supplierTax.organizationName}
    />
  );
}
