import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getSalesSettings } from "@/features/sales-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { EstimateCreatePage } from "@/features/estimates/presentation/page/EstimateCreatePage";

export const dynamic = "force-dynamic";

export default async function NewEstimatePage() {
  const [{ customers }, { products }, salesSettings, supplierTax] = await Promise.all([
    getCustomers(),
    getProducts({ status: "ACTIVE" }),
    getSalesSettings(),
    getSupplierTaxContext(),
  ]);

  return (
    <EstimateCreatePage
      initialCustomers={customers}
      initialProducts={products}
      salesSettings={salesSettings}
      supplierState={supplierTax.state}
      supplierGstin={supplierTax.gstNumber}
      supplierName={supplierTax.organizationName}
      initialDefaultNotes={salesSettings.defaultNotes || ""}
      initialDefaultTerms={salesSettings.defaultTerms || ""}
    />
  );
}
