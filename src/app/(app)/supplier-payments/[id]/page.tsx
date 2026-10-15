import { notFound } from "next/navigation";
import { getSupplierPaymentById } from "@/features/supplier-payments";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { SupplierPaymentDetailPage } from "@/features/supplier-payments/presentation/page/SupplierPaymentDetailPage";

export const dynamic = "force-dynamic";

type SupplierPaymentDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function SupplierPaymentDetailRoute({
  params,
}: SupplierPaymentDetailRouteProps) {
  const resolvedParams = await params;
  const payment = await getSupplierPaymentById(resolvedParams.id);

  if (!payment) {
    notFound();
  }

  const supplierTax = await getSupplierTaxContext();

  return (
    <SupplierPaymentDetailPage
      payment={payment}
      organizationName={supplierTax.organizationName}
    />
  );
}
