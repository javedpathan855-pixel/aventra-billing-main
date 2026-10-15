import { notFound } from "next/navigation";
import { getSupplier } from "@/features/suppliers/data/queries/get-supplier";
import { SupplierCreatePage } from "@/features/suppliers/presentation/page/SupplierCreatePage";

export const dynamic = "force-dynamic";

export default async function SupplierEditRoute({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const supplier = await getSupplier(resolvedParams.id);

  if (!supplier) {
    notFound();
  }

  return <SupplierCreatePage initialData={supplier} isEdit />;
}
