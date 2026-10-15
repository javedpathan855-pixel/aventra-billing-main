"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/shared/lib/money";
import type { PurchaseReportsBundle } from "../../domain/entities/purchase-report";
import { PurchaseReportFilterBar } from "../components/PurchaseReportFilterBar";
import { PurchaseReportSummaryCards } from "../components/PurchaseReportSummaryCards";
import { SupplierPurchasesTable } from "../components/SupplierPurchasesTable";
import { OutstandingBillsTable } from "../components/OutstandingBillsTable";
import { TaxSummaryCard } from "../components/TaxSummaryCard";
import { PaymentSummaryTables } from "../components/PaymentSummaryTables";
import { DocumentStatusTables } from "../components/DocumentStatusTables";

export type SupplierOption = {
  id: string;
  name: string;
};

export type PurchaseReportsPageProps = {
  reports: PurchaseReportsBundle;
  suppliers?: SupplierOption[];
  initialFrom?: string;
  initialTo?: string;
  initialSupplierId?: string;
};

export const PurchaseReportsPage = ({
  reports,
  suppliers = [],
  initialFrom = "",
  initialTo = "",
  initialSupplierId = "all",
}: PurchaseReportsPageProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [supplierId, setSupplierId] = useState(initialSupplierId);

  const navigateWithFilters = (
    nextFrom: string,
    nextTo: string,
    nextSupplier: string,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) {
      params.set("from", nextFrom);
    } else {
      params.delete("from");
    }
    if (nextTo) {
      params.set("to", nextTo);
    } else {
      params.delete("to");
    }
    if (nextSupplier && nextSupplier !== "all") {
      params.set("supplierId", nextSupplier);
    } else {
      params.delete("supplierId");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/purchase-bills"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Purchase Bills
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Purchase Reports
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Purchases, returns, taxes, payments, and outstanding payables from
            authorized records. Gross figures cover confirmed bills; returns
            cover completed returns.
          </p>
        </div>
      </div>

      <PurchaseReportFilterBar
        fromDate={fromDate}
        onFromDateChange={(date) => {
          setFromDate(date);
          navigateWithFilters(date, toDate, supplierId);
        }}
        toDate={toDate}
        onToDateChange={(date) => {
          setToDate(date);
          navigateWithFilters(fromDate, date, supplierId);
        }}
        supplierId={supplierId}
        onSupplierChange={(id) => {
          setSupplierId(id);
          navigateWithFilters(fromDate, toDate, id);
        }}
        suppliers={suppliers}
      />

      <PurchaseReportSummaryCards
        summary={reports.summary}
        totalOutstanding={reports.outstanding.totalOutstanding}
      />

      <SupplierPurchasesTable rows={reports.bySupplier} />

      <OutstandingBillsTable outstanding={reports.outstanding} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-start">
        <TaxSummaryCard tax={reports.tax} />
        <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-2.5">
          <h2 className="text-base font-semibold text-text-primary">
            Reconciliation
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Net purchases reconcile as gross purchases minus completed
            returns: {formatCurrency(reports.summary.grossPurchases)} −{" "}
            {formatCurrency(reports.summary.returnsTotal)} ={" "}
            {formatCurrency(reports.summary.netPurchases)}. Net input tax
            reconciles likewise: {formatCurrency(reports.summary.inputTax)} −{" "}
            {formatCurrency(reports.summary.returnsTax)} ={" "}
            {formatCurrency(reports.summary.netTax)}.
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Outstanding payables reconcile as confirmed bill totals minus
            active payment allocations. Returns never reduce outstanding
            balances: supplier credit notes are not implemented.
          </p>
        </div>
      </div>

      <PaymentSummaryTables payments={reports.payments} />

      <DocumentStatusTables orders={reports.orders} returns={reports.returns} />
    </section>
  );
};
