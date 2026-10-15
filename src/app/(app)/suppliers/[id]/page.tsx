import { notFound } from "next/navigation";
import { getSupplier } from "@/features/suppliers/data/queries/get-supplier";
import { SupplierDetailPage } from "@/features/suppliers/presentation/page/SupplierDetailPage";

export const dynamic = "force-dynamic";

export default async function SupplierDetailsPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const supplier = await getSupplier(resolvedParams.id);

  if (!supplier) {
    notFound();
  }

  return <SupplierDetailPage supplier={supplier} />;
}
