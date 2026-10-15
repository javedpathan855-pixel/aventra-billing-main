import { getSupplierPayments } from "@/features/supplier-payments";
import { SupplierPaymentListPage } from "@/features/supplier-payments/presentation/page/SupplierPaymentListPage";
import type {
  SupplierPaymentMethod,
  SupplierPaymentStatus,
} from "@/features/supplier-payments";

export const dynamic = "force-dynamic";

type SupplierPaymentsRouteProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    method?: string;
    page?: string;
  }>;
};

const VALID_STATUSES: SupplierPaymentStatus[] = ["Active", "Reversed"];
const VALID_METHODS: SupplierPaymentMethod[] = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Card",
  "Other",
];

export default async function SupplierPaymentsRoute({
  searchParams,
}: SupplierPaymentsRouteProps) {
  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const status: SupplierPaymentStatus | "ALL" =
    params.status && (VALID_STATUSES as string[]).includes(params.status)
      ? (params.status as SupplierPaymentStatus)
      : "ALL";
  const method: SupplierPaymentMethod | "ALL" =
    params.method && (VALID_METHODS as string[]).includes(params.method)
      ? (params.method as SupplierPaymentMethod)
      : "ALL";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { payments, metrics, totalCount, pageSize, totalPages } =
    await getSupplierPayments({
      query,
      status,
      method,
      page,
      pageSize: 20,
    });

  return (
    <SupplierPaymentListPage
      initialPayments={payments}
      metrics={metrics}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      initialQuery={params.q || ""}
      initialStatus={params.status || "all"}
      initialMethod={params.method || "all"}
    />
  );
}
