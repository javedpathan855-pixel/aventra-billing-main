import { getPurchaseReturns } from "@/features/purchase-returns";
import { PurchaseReturnListPage } from "@/features/purchase-returns/presentation/page/PurchaseReturnListPage";
import type { PurchaseReturnStatus } from "@/features/purchase-returns";

export const dynamic = "force-dynamic";

type PurchaseReturnsRouteProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

const VALID_STATUSES: PurchaseReturnStatus[] = [
  "DRAFT",
  "APPROVED",
  "COMPLETED",
  "CANCELLED",
];

export default async function PurchaseReturnsRoute({
  searchParams,
}: PurchaseReturnsRouteProps) {
  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const status: PurchaseReturnStatus | "ALL" =
    params.status && (VALID_STATUSES as string[]).includes(params.status)
      ? (params.status as PurchaseReturnStatus)
      : "ALL";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { returns, metrics, totalCount, pageSize, totalPages } =
    await getPurchaseReturns({
      search: query,
      status,
      page,
      pageSize: 20,
    });

  return (
    <PurchaseReturnListPage
      initialReturns={returns}
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
