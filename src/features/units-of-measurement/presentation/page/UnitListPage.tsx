"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DatabaseZap, Plus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { UnitStatus } from "../../domain/entities/unit";
import type { UnitDto } from "../../data/dto/unit-dto";
import { seedDefaultUnitsAction } from "../../data/mutations/seed-default-units";
import { UnitFilterBar } from "../components/UnitFilterBar";
import { UnitTable } from "../components/UnitTable";
import { Pagination } from "@/shared/components/table";

export type UnitListPageProps = {
  initialUnits?: UnitDto[];
  totalCount?: number;
  usageCounts?: Record<string, number>;
  initialQuery?: string;
  initialStatus?: UnitStatus | "ALL";
  initialPage?: number;
  pageSize?: number;
  showSavedBanner?: boolean;
};

export const UnitListPage = ({
  initialUnits = [],
  totalCount = 0,
  usageCounts = {},
  initialQuery = "",
  initialStatus = "ALL",
  initialPage = 1,
  pageSize = 10,
  showSavedBanner = false,
}: UnitListPageProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSeeding, startSeedTransition] = useTransition();
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<UnitStatus | "ALL">(initialStatus);

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

  const handleStatusChange = (val: UnitStatus | "ALL") => {
    setStatus(val);
    pushParams({ status: val === "ALL" ? null : val, page: "1" });
  };

  const handleResetFilters = () => {
    setQuery("");
    setStatus("ALL");
    router.push(pathname);
  };

  const handleSeed = () => {
    setSeedMessage(null);
    startSeedTransition(async () => {
      const result = await seedDefaultUnitsAction();
      if (!result.success) {
        setSeedMessage(result.error || "Failed to seed standard units.");
        return;
      }
      setSeedMessage(
        `Seeded ${result.data?.created ?? 0} units (${result.data?.skipped ?? 0} already present).`,
      );
      router.refresh();
    });
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const isFiltered = initialQuery.trim().length > 0 || initialStatus !== "ALL";

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Units of Measurement
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage supported units for quantities and billing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-xs font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-60 cursor-pointer"
          >
            <DatabaseZap size={15} />
            <span>{isSeeding ? "Seeding..." : "Seed standards"}</span>
          </button>
          <Link
            href="/units/new"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Plus size={15} />
            <span>Add Unit</span>
          </Link>
        </div>
      </header>

      {showSavedBanner && (
        <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success" role="status">
          Unit saved successfully.
        </div>
      )}

      {seedMessage && (
        <div className="rounded-lg border border-border bg-surface-card p-3 text-sm text-text-secondary" role="status">
          {seedMessage}
        </div>
      )}

      <UnitFilterBar
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={handleStatusChange}
        onReset={handleResetFilters}
      />

      <UnitTable
        units={initialUnits}
        usageCounts={usageCounts}
        isFiltered={isFiltered}
        onClearFilters={handleResetFilters}
      />

      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-4 sm:flex-row">
          <p className="text-xs text-text-secondary">
            Showing {(initialPage - 1) * pageSize + 1} to{" "}
            {Math.min(initialPage * pageSize, totalCount)} of {totalCount} units
          </p>
          <Pagination
            currentPage={initialPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={(page) => pushParams({ page: String(page) })}
            itemName="units"
          />
        </div>
      )}
    </section>
  );
};
