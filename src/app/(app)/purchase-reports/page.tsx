import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { getPurchaseReports } from "@/features/purchase-reports";
import { PurchaseReportsPage } from "@/features/purchase-reports/presentation/page/PurchaseReportsPage";

export const dynamic = "force-dynamic";

type PurchaseReportsRouteProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    supplierId?: string;
  }>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function PurchaseReportsRoute({
  searchParams,
}: PurchaseReportsRouteProps) {
  const params = await searchParams;

  const from =
    params.from && DATE_PATTERN.test(params.from)
      ? new Date(`${params.from}T00:00:00.000Z`)
      : undefined;
  const to =
    params.to && DATE_PATTERN.test(params.to)
      ? new Date(`${params.to}T00:00:00.000Z`)
      : undefined;
  const supplierId =
    typeof params.supplierId === "string" && params.supplierId.trim()
      ? params.supplierId.trim()
      : undefined;

  const [{ suppliers }, reports] = await Promise.all([
    getSuppliers({ status: "ACTIVE", page: 1, pageSize: 100 }),
    getPurchaseReports({ from, to, supplierId }),
  ]);

  return (
    <PurchaseReportsPage
      reports={reports}
      suppliers={suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
      }))}
      initialFrom={params.from || ""}
      initialTo={params.to || ""}
      initialSupplierId={supplierId || "all"}
    />
  );
}
