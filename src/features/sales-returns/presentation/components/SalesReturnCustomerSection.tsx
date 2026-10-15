"use client";

import Link from "next/link";
import {
  FileText,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { DatePicker, Input, Label, Select } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type { ReturnableInvoice } from "../../domain/entities/sales-return";

export type SalesReturnCustomerSectionProps = {
  returnableInvoices: ReturnableInvoice[];
  selectedInvoiceId: string;
  onSelectInvoice: (invoiceId: string) => void;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  customerPlaceOfSupply: string;
  returnNumber: string;
  onReturnNumberChange: (val: string) => void;
  returnDate: string;
  onReturnDateChange: (val: string) => void;
  reason: string;
  onReasonChange: (val: string) => void;
  fieldErrors?: Record<string, string>;
};

export const SalesReturnCustomerSection = ({
  returnableInvoices,
  selectedInvoiceId,
  onSelectInvoice,
  customerName,
  onCustomerNameChange,
  customerEmail,
  customerAddress,
  customerGstin,
  customerPlaceOfSupply,
  returnNumber,
  onReturnNumberChange,
  returnDate,
  onReturnDateChange,
  reason,
  onReasonChange,
  fieldErrors = {},
}: SalesReturnCustomerSectionProps) => {
  const selectedInvoice =
    returnableInvoices.find((i) => i.id === selectedInvoiceId) || null;

  const invoiceOptions = [
    { value: "", label: "— Search or select an invoiced sale... —" },
    ...returnableInvoices.map((inv) => ({
      value: inv.id,
      label: `${inv.invoiceNumber} - ${inv.customerName} (${
        inv.items.filter((i) => i.remainingReturnableQuantity > 0).length
      } returnable items)`,
    })),
  ];

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-6">
      {/* 1. Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <RotateCcw size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Return &amp; Customer Details
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Select an invoiced sale and specify return parameters, return date, and commercial reason.
          </p>
        </div>
      </div>

      {/* 2. Invoice & Customer Snapshot */}
      <div className="space-y-4">
        {/* Invoice Selector */}
        <div className="w-full max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between">
            <Label
              htmlFor="sales-return-invoice-select"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Original Invoiced Sale <span className="text-danger">*</span>
            </Label>
            <Link
              href="/invoices"
              target="_blank"
              className="text-xs font-semibold text-primary-light hover:text-primary transition-colors"
            >
              View Invoices &rarr;
            </Link>
          </div>

          <div className="relative">
            <Select
              id="sales-return-invoice-select"
              value={selectedInvoiceId}
              onChange={onSelectInvoice}
              options={invoiceOptions}
              className={cn(fieldErrors.customerName && "border-danger focus:border-danger")}
            />
            <Search
              size={14}
              className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
          </div>
          {fieldErrors.customerName && (
            <p className="mt-1 text-xs text-danger">{fieldErrors.customerName}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Selecting an invoice pre-populates customer billing details and validates returnable balances.
          </p>
        </div>

        {/* Selected Customer Snapshot Card */}
        {customerName ? (
          <div className="rounded-xl border border-border/80 bg-surface-alt/40 p-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-sm sm:text-base">
                  {customerName}
                </span>
                {selectedInvoice?.invoiceNumber && (
                  <span className="rounded-full bg-surface-card border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    Invoice: {selectedInvoice.invoiceNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {customerGstin ? (
                  <span className="rounded bg-surface-card px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary border border-border/60">
                    GSTIN: {customerGstin}
                  </span>
                ) : (
                  <span className="text-text-muted text-[11px]">Unregistered</span>
                )}
                {customerPlaceOfSupply && (
                  <span className="rounded bg-surface-card px-2 py-0.5 text-[11px] font-medium text-text-secondary border border-border/60">
                    POS: {customerPlaceOfSupply}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="flex items-start gap-2">
                <Mail size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Billing Email
                  </span>
                  <span className="text-text-primary font-medium truncate block">
                    {customerEmail || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Place of Supply
                  </span>
                  <span className="text-text-primary font-medium block">
                    {customerPlaceOfSupply || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <FileText size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Reference Sale
                  </span>
                  <span className="text-text-primary font-medium block font-mono">
                    {selectedInvoice ? selectedInvoice.invoiceNumber : "Manual Entry"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Billing Address
                  </span>
                  <span className="text-text-secondary line-clamp-2 leading-relaxed">
                    {customerAddress || "No billing address provided"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface-alt/20 p-4 text-center">
            <Users size={20} className="mx-auto text-text-muted mb-1" />
            <p className="text-xs text-text-secondary">
              No invoice selected yet. Choose an invoice above to load address snapshots and returnable balances.
            </p>
          </div>
        )}

        {/* Manual Customer Fallback if not selecting an invoice */}
        {!selectedInvoiceId && (
          <div className="pt-2">
            <Label
              htmlFor="manual-customer-name"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Or Enter Customer Name Directly <span className="text-danger">*</span>
            </Label>
            <Input
              id="manual-customer-name"
              type="text"
              value={customerName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onCustomerNameChange(e.target.value)
              }
              placeholder="e.g. Acme Corporation"
              className="mt-1.5 h-10 text-sm"
            />
          </div>
        )}
      </div>

      {/* 3. Parameter Fields Row: Return #, Return Date, Reason, PO/Invoice Ref */}
      <div className="border-t border-border/80 pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label
              htmlFor="sales-return-number"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Return Number <span className="text-danger">*</span>
            </Label>
            <div className="mt-1.5">
              <Input
                id="sales-return-number"
                type="text"
                value={returnNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onReturnNumberChange(e.target.value)
                }
                placeholder="SR-0001"
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="sales-return-date"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Return Date <span className="text-danger">*</span>
            </Label>
            <div className="mt-1.5">
              <DatePicker
                id="sales-return-date"
                value={returnDate}
                onChange={onReturnDateChange}
                className={cn(fieldErrors.returnDate && "border-danger focus:border-danger")}
              />
              {fieldErrors.returnDate && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.returnDate}</p>
              )}
            </div>
          </div>

          <div>
            <Label
              htmlFor="sales-return-reason"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Return Reason <span className="text-danger">*</span>
            </Label>
            <div className="mt-1.5">
              <Input
                id="sales-return-reason"
                type="text"
                value={reason}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onReasonChange(e.target.value)
                }
                placeholder="e.g. Defective in transit, Wrong specification"
                className="text-sm"
              />
              {fieldErrors.reason && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.reason}</p>
              )}
            </div>
          </div>

          <div>
            <Label
              htmlFor="sales-return-invoice-ref"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Original Invoice Ref #
            </Label>
            <div className="mt-1.5">
              <Input
                id="sales-return-invoice-ref"
                type="text"
                value={selectedInvoice?.invoiceNumber || ""}
                readOnly
                placeholder="Linked on selection"
                className="font-mono text-sm bg-surface-alt/40 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
