import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { getPayableBills } from "@/features/supplier-payments";
import { SupplierPaymentCreatePage } from "@/features/supplier-payments/presentation/page/SupplierPaymentCreatePage";

export const dynamic = "force-dynamic";

type NewSupplierPaymentPageProps = {
  searchParams: Promise<{ supplierId?: string }>;
};

export default async function NewSupplierPaymentPage({
  searchParams,
}: NewSupplierPaymentPageProps) {
  const params = await searchParams;
  const supplierId =
    typeof params.supplierId === "string" && params.supplierId.trim()
      ? params.supplierId.trim()
      : undefined;

  const [{ suppliers }, payableBills] = await Promise.all([
    getSuppliers({ status: "ACTIVE", page: 1, pageSize: 100 }),
    getPayableBills(supplierId ? { supplierId } : undefined),
  ]);

  return (
    <SupplierPaymentCreatePage
      initialSuppliers={suppliers}
      initialPayableBills={payableBills}
      preselectedSupplierId={supplierId || ""}
    />
  );
}
