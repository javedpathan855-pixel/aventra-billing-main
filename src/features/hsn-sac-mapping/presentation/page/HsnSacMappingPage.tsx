"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Database, Package } from "lucide-react";
import { useEffect, useState } from "react";
import type { HsnSacType } from "../../domain/entities/hsn-sac-code";
import type { HsnSacCodeDto, MappedClassification } from "../../data/dto/hsn-sac-dto";
import type { HsnSacImportStatus } from "../../domain/repositories/hsn-sac-repository";
import { HsnSacFilterBar } from "../components/HsnSacFilterBar";
import { HsnSacTable } from "../components/HsnSacTable";
import { Pagination } from "@/shared/components/table";

export type HsnSacMappingPageProps = {
  initialCodes?: HsnSacCodeDto[];
  totalCount?: number;
  importStatus?: HsnSacImportStatus;
  mapped?: MappedClassification[];
  initialQuery?: string;
  initialType?: HsnSacType | "ALL";
  initialPage?: number;
  pageSize?: number;
};

export const HsnSacMappingPage = ({
  initialCodes = [],
  totalCount = 0,
  importStatus = { hsnCount: 0, sacCount: 0 },
  mapped = [],
  initialQuery = "",
  initialType = "ALL",
  initialPage = 1,
  pageSize = 20,
}: HsnSacMappingPageProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<HsnSacType | "ALL">(initialType);

  useEffect(() => {
    if (query === initialQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) {
        params.set("query", query.trim());
      } else {
        params.delete("query");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, initialQuery, pathname, router, searchParams]);

  const pushParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleTypeChange = (val: HsnSacType | "ALL") => {
    setType(val);
    pushParams({ type: val === "ALL" ? null : val, page: "1" });
  };

  const handleResetFilters = () => {
    setQuery("");
    setType("ALL");
    router.push(pathname);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isFiltered = initialQuery.trim().length > 0 || initialType !== "ALL";

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            HSN / SAC Mapping
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Browse GST classification codes and review catalogue mappings. Products use HSN, services use SAC.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface-card p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <Database size={15} />
            <p className="text-xs font-medium uppercase tracking-wide">HSN codes</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary tabular-nums">{importStatus.hsnCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-5">
          <div className="flex items-center gap-2 text-text-muted">
            <Database size={15} />
            <p className="text-xs font-medium uppercase tracking-wide">SAC codes</p>
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary tabular-nums">{importStatus.sacCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-card p-5 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Data source</p>
          <p className="mt-2 truncate font-mono text-sm text-text-primary">
            {importStatus.sourceFile || "Not imported yet"}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {importStatus.lastImportedAt
              ? `Last imported ${new Date(importStatus.lastImportedAt).toLocaleDateString("en-IN")}. Managed by the authorized operator import script — GST rates stay in tax configuration.`
              : "An authorized operator loads HSN_SAC.xlsx with npm run import:hsn-sac."}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Mapped in your catalogue</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Classification codes currently assigned to your products and services.
          </p>
        </div>
        {mapped.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt text-text-muted">
              <Package size={20} />
            </div>
            <p className="mt-3 text-sm font-medium text-text-primary">No mappings yet</p>
            <p className="mt-1 max-w-sm text-xs text-text-secondary">
              Assign HSN codes to products and SAC codes to services from their records.
            </p>
            <Link href="/products" className="mt-3 text-xs font-medium text-primary-light hover:underline">
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {mapped.map((m) => (
              <li key={`${m.type}:${m.code}`} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    <span className="font-mono">{m.code}</span>
                    <span className="ml-2 rounded-md border border-border/70 bg-surface-alt px-1.5 py-0.5 text-[11px] text-text-secondary">
                      {m.type}
                    </span>
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {m.description || "Code not in the imported master."}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-secondary tabular-nums">
                  {m.itemCount} item{m.itemCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <HsnSacFilterBar
        query={query}
        onQueryChange={setQuery}
        type={type}
        onTypeChange={handleTypeChange}
        onReset={handleResetFilters}
      />

      <HsnSacTable
        codes={initialCodes}
        isFiltered={isFiltered}
        onClearFilters={handleResetFilters}
      />

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-4 sm:flex-row">
          <p className="text-xs text-text-secondary">
            Showing {(initialPage - 1) * pageSize + 1} to{" "}
            {Math.min(initialPage * pageSize, totalCount)} of {totalCount} codes
          </p>
          <Pagination
            currentPage={initialPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={(page) => pushParams({ page: String(page) })}
            itemName="codes"
          />
        </div>
      )}
    </section>
  );
};
