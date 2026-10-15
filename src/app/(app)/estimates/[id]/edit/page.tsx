import { notFound, redirect } from "next/navigation";
import { getEstimateById } from "@/features/estimates";
import { getCustomers } from "@/features/customers/data/queries/get-customers";
import { getProducts } from "@/features/products/data/queries/get-products";
import { getSalesSettings } from "@/features/sales-settings";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { EstimateCreatePage } from "@/features/estimates/presentation/page/EstimateCreatePage";

export const dynamic = "force-dynamic";

type EstimateEditRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditEstimateRoute({ params }: EstimateEditRouteProps) {
  const resolvedParams = await params;
  const estimate = await getEstimateById(resolvedParams.id);

  if (!estimate) {
    notFound();
  }

  // Only draft estimates can be edited
  if (estimate.status !== "Draft") {
    redirect(`/estimates/${estimate.id}`);
  }

  const [{ customers }, { products }, salesSettings, supplierTax] = await Promise.all([
    getCustomers(),
    getProducts({ status: "ACTIVE" }),
    getSalesSettings(),
    getSupplierTaxContext(),
  ]);

  return (
    <EstimateCreatePage
      initialEstimate={estimate}
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
