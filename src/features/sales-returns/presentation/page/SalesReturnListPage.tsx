"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Undo2 } from "lucide-react";
import { Button } from "@/shared/components/form";
import type { SalesReturn } from "../../domain/entities/sales-return";
import { SalesReturnTable } from "../components/SalesReturnTable";
import { SalesReturnFilterBar } from "../components/SalesReturnFilterBar";

export type SalesReturnListPageProps = {
  initialReturns: SalesReturn[];
};

export const SalesReturnListPage = ({
  initialReturns,
}: SalesReturnListPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReturns = initialReturns.filter((ret) => {
    if (statusFilter !== "all" && ret.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchNumber = ret.returnNumber.toLowerCase().includes(q);
      const matchCustomer = ret.customerName.toLowerCase().includes(q);
      const matchReason = ret.reason.toLowerCase().includes(q);
      const matchInvoice = (ret.invoiceNumber || "").toLowerCase().includes(q);
      const matchCn = (ret.creditNoteNumber || "").toLowerCase().includes(q);
      return matchNumber || matchCustomer || matchReason || matchInvoice || matchCn;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
              <Undo2 size={20} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Sales Returns
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Process goods returns, return authorizations, inspections, item dispositions, and credit adjustments.
          </p>
        </div>

        <Link href="/sales-returns/new">
          <Button variant="primary" className="h-10 px-4 text-sm font-semibold shadow-xs">
            <Plus size={16} />
            <span>Create Sales Return</span>
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <SalesReturnFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Table */}
      <SalesReturnTable returns={filteredReturns} />
    </div>
  );
};
