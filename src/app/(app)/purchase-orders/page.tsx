import { getPurchaseOrders } from "@/features/purchase-orders";
import { PurchaseOrderListPage } from "@/features/purchase-orders/presentation/page/PurchaseOrderListPage";
import type { PurchaseOrderStatus } from "@/features/purchase-orders";

export const dynamic = "force-dynamic";

type PurchaseOrdersRouteProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

const VALID_STATUSES: PurchaseOrderStatus[] = [
  "Draft",
  "Confirmed",
  "PartiallyReceived",
  "Received",
  "Cancelled",
];

export default async function PurchaseOrdersRoute({
  searchParams,
}: PurchaseOrdersRouteProps) {
  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const status: PurchaseOrderStatus | "ALL" =
    params.status && (VALID_STATUSES as string[]).includes(params.status)
      ? (params.status as PurchaseOrderStatus)
      : "ALL";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { orders, metrics, totalCount, pageSize, totalPages } =
    await getPurchaseOrders({
      query,
      status,
      page,
      pageSize: 20,
    });

  return (
    <PurchaseOrderListPage
      initialOrders={orders}
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
