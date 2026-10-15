import { notFound } from "next/navigation";
import { getPurchaseBillById } from "@/features/purchase-bills";
import { getSupplierPaymentsForBill } from "@/features/supplier-payments";
import { calculateBillOutstanding } from "@/features/purchase-reports";
import { getSupplierTaxContext } from "@/features/invoices/data/queries/get-supplier-tax-context";
import { PurchaseBillDetailPage } from "@/features/purchase-bills/presentation/page/PurchaseBillDetailPage";

export const dynamic = "force-dynamic";

type PurchaseBillDetailRouteProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function PurchaseBillDetailRoute({
  params,
}: PurchaseBillDetailRouteProps) {
  const resolvedParams = await params;
  const bill = await getPurchaseBillById(resolvedParams.id);

  if (!bill) {
    notFound();
  }

  const supplierTax = await getSupplierTaxContext();
  const payments = await getSupplierPaymentsForBill(bill.id);
  const activeAllocated = payments
    .filter((payment) => payment.status === "Active")
    .flatMap((payment) => payment.allocations)
    .filter((line) => line.purchaseBillId === bill.id)
    .reduce((sum, line) => sum + line.amount, 0);
  const outstanding = calculateBillOutstanding(bill.total, activeAllocated);

  return (
    <PurchaseBillDetailPage
      bill={bill}
      organizationName={supplierTax.organizationName}
      payments={payments}
      outstanding={outstanding}
    />
  );
}
