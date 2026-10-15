import { getSuppliers } from "@/features/suppliers/data/queries/get-suppliers";
import { supplierFilterSchema } from "@/features/suppliers/data/validators/supplier-schemas";
import { SupplierListPage } from "@/features/suppliers/presentation/page/SupplierListPage";

export const dynamic = "force-dynamic";

type SuppliersPageProps = {
  searchParams: Promise<{ query?: string; status?: string; page?: string; saved?: string }>;
};

const PAGE_SIZE = 8;

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const raw = await searchParams;
  const parsed = supplierFilterSchema.safeParse({
    query: raw.query,
    status: raw.status,
    page: raw.page,
    pageSize: PAGE_SIZE,
  });

  const filter = parsed.success
    ? { query: parsed.data.query, status: parsed.data.status, page: parsed.data.page }
    : { query: undefined, status: "ALL" as const, page: 1 };
  const { suppliers, totalCount } = await getSuppliers({
    ...filter,
    pageSize: PAGE_SIZE,
  });

  return (
    <SupplierListPage
      key={`${filter.query ?? ""}|${filter.status}|${filter.page}`}
      initialSuppliers={suppliers}
      totalCount={totalCount}
      initialQuery={filter.query ?? ""}
      initialStatus={filter.status}
      initialPage={filter.page}
      pageSize={PAGE_SIZE}
      showSavedBanner={raw.saved === "1"}
    />
  );
}
