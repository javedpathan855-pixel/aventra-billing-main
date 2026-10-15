import { getPurchaseBills } from "@/features/purchase-bills";
import { PurchaseBillListPage } from "@/features/purchase-bills/presentation/page/PurchaseBillListPage";
import type { PurchaseBillStatus } from "@/features/purchase-bills";

export const dynamic = "force-dynamic";

type PurchaseBillsRouteProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

const VALID_STATUSES: PurchaseBillStatus[] = [
  "Draft",
  "Confirmed",
  "Cancelled",
];

export default async function PurchaseBillsRoute({
  searchParams,
}: PurchaseBillsRouteProps) {
  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const status: PurchaseBillStatus | "ALL" =
    params.status && (VALID_STATUSES as string[]).includes(params.status)
      ? (params.status as PurchaseBillStatus)
      : "ALL";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { bills, metrics, totalCount, pageSize, totalPages } =
    await getPurchaseBills({
      query,
      status,
      page,
      pageSize: 20,
    });

  return (
    <PurchaseBillListPage
      initialBills={bills}
      metrics={metrics}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      initialQuery={params.q || ""}
      initialStatus={params.status || "all"}
    />
  );
}
