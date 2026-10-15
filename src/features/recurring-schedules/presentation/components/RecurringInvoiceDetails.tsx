import Link from "next/link";
import { Building2, FileText, Globe, Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { Input, Label, Select } from "@/shared/components/form";

export type RecurringCustomerOption = {
  id: string;
  name: string;
  email: string;
  address: string;
  gstin: string;
  placeOfSupply: string;
  paymentTerms: string;
  contactPerson?: string;
  phone?: string;
  pan?: string;
  state?: string;
};

export type RecurringCustomerSnapshot = {
  name: string;
  email: string;
  address: string;
  gstin: string;
  placeOfSupply: string;
  contactPerson?: string;
  phone?: string;
  pan?: string;
};

export type RecurringInvoiceDetailsProps = {
  customers: RecurringCustomerOption[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  /** Effective billing snapshot: the selected customer, or the stored
      snapshot when editing without re-selecting. Display-only — snapshots
      are captured at save, never edited as duplicate fields. */
  snapshot: RecurringCustomerSnapshot | null;
  customerError?: string;
  placeOfSupplyError?: string;
  invoiceNumberPreview: string;
  paymentTerms: string;
  onPaymentTermsChange: (val: string) => void;
  taxTreatmentLabel: string;
};

/**
 * Invoice Details card mirroring Create Invoice's CustomerSection structure:
 * header, customer selector with add-customer affordance and empty state,
 * read-only customer profile card, and a parameters row. Schedule-specific
 * differences are deliberate: the invoice number is a read-only preview
 * (never consumed here), there are no issue/due dates on a template, and
 * values feed frozen per-generation snapshots instead of an invoice draft.
 */
export const RecurringInvoiceDetails = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  snapshot,
  customerError,
  placeOfSupplyError,
  invoiceNumberPreview,
  paymentTerms,
  onPaymentTermsChange,
  taxTreatmentLabel,
}: RecurringInvoiceDetailsProps) => {
  const contactPerson = snapshot?.contactPerson || "—";
  const phone = snapshot?.phone || "—";
  const pan = snapshot?.pan || "—";
  const state = snapshot?.placeOfSupply || "—";

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <FileText size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Invoice Details
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Select a customer for the generated invoices.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between">
            <Label
              htmlFor="recurring-invoice-customer"
              className="block text-xs font-medium text-text-secondary"
            >
              Customer <span className="text-danger">*</span>
            </Label>
            <Link
              href="/customers/new"
              className="text-[11px] font-medium text-primary-light transition-colors hover:underline"
            >
              + Add Customer
            </Link>
          </div>

          {customers.length === 0 ? (
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-surface-alt/40 p-3 text-xs text-text-secondary">
              <span>No customer records found in this organization.</span>
              <Link
                href="/customers/new"
                className="font-medium text-primary-light hover:underline"
              >
                Create Customer
              </Link>
            </div>
          ) : (
            <Select
              id="recurring-invoice-customer"
              value={selectedCustomerId}
              onChange={onSelectCustomer}
              placeholder="Search and select a customer..."
              aria-invalid={Boolean(customerError)}
              aria-describedby={customerError ? "recurring-customer-error" : undefined}
              startIcon={<Search size={16} className="text-text-muted" />}
              className="h-11"
            >
              <option value="">Search and select a customer...</option>
              {customers.map((c) => (
                <option key={c.id || c.name} value={c.id}>
                  {c.name} {c.gstin ? `(${c.gstin})` : c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </Select>
          )}

          {customerError && (
            <span id="recurring-customer-error" className="mt-1.5 block text-xs text-danger" role="alert">
              {customerError}
            </span>
          )}
        </div>

        {snapshot ? (
          <div className="rounded-xl border border-border bg-surface-alt/50 p-4 sm:p-5 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface text-primary-light">
                  <Building2 size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary tracking-tight">
                    {snapshot.name}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {contactPerson !== "—" ? `${contactPerson} • ` : ""}Customer Profile
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-surface px-2.5 py-1 text-xs text-text-secondary">
                  <span className="text-[11px] font-medium text-text-muted">GSTIN:</span>
                  <span className="font-mono text-xs font-semibold text-primary-light">
                    {snapshot.gstin || "Unregistered"}
                  </span>
                </div>
                {pan !== "—" && (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-surface px-2.5 py-1 text-xs text-text-secondary">
                    <span className="text-[11px] font-medium text-text-muted">PAN:</span>
                    <span className="font-mono text-xs font-semibold text-text-primary">{pan}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-lg border border-border/50 bg-surface/60 p-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted mb-1">
                  <Mail size={12} className="text-primary-light" />
                  Billing Email
                </span>
                <span className="font-medium text-text-primary truncate block" title={snapshot.email || "No email"}>
                  {snapshot.email || "—"}
                </span>
              </div>

              <div className="rounded-lg border border-border/50 bg-surface/60 p-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted mb-1">
                  <Phone size={12} className="text-primary-light" />
                  Contact Phone
                </span>
                <span className="font-medium text-text-primary tabular-nums block">
                  {phone}
                </span>
              </div>

              <div className={`rounded-lg border p-2.5 ${placeOfSupplyError ? "border-danger bg-danger/10" : "border-border/50 bg-surface/60"}`}>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted mb-1">
                  <Globe size={12} className="text-primary-light" />
                  Place of Supply
                </span>
                <span className="font-medium text-text-primary truncate block" title={state}>
                  {state}
                </span>
                {placeOfSupplyError && (
                  <span className="mt-1 block text-[10px] text-danger" role="alert">
                    {placeOfSupplyError}
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-border/50 bg-surface/60 p-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted mb-1">
                  <MapPin size={12} className="text-primary-light" />
                  Billing Address
                </span>
                <span className="font-medium text-text-secondary truncate block" title={snapshot.address || "No address"}>
                  {snapshot.address || "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-border/80 bg-surface-alt/30 p-5 transition-colors">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface-alt/80 text-primary-light/80">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Customer Details</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Select a customer to view their information.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-5 border-t border-border/60">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label
              htmlFor="recurring-first-invoice-number"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              First Invoice Number
            </Label>
            <Input
              id="recurring-first-invoice-number"
              type="text"
              value={invoiceNumberPreview}
              readOnly
              placeholder="Auto-allocated on generation"
              aria-describedby="first-invoice-number-hint"
              className="h-10 px-3.5 text-sm tabular-nums opacity-80"
            />
            <p id="first-invoice-number-hint" className="mt-1 text-[11px] text-text-muted">
              From Billing Settings. Preview only — never consumed here.
            </p>
          </div>

          <div>
            <Label
              htmlFor="recurring-payment-terms"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Payment Terms
            </Label>
            <Select
              id="recurring-payment-terms"
              value={paymentTerms}
              onChange={onPaymentTermsChange}
              className="h-10"
            >
              <option value="Net 15 days">Net 15 days</option>
              <option value="Net 30 days">Net 30 days</option>
              <option value="Net 45 days">Net 45 days</option>
              <option value="Net 60 days">Net 60 days</option>
              <option value="Due on receipt">Due on receipt</option>
              <option value="Due on Receipt">Due on Receipt</option>
              {paymentTerms &&
                !["Net 15 days", "Net 30 days", "Net 45 days", "Net 60 days", "Due on receipt", "Due on Receipt"].includes(
                  paymentTerms,
                ) && <option value={paymentTerms}>{paymentTerms}</option>}
            </Select>
          </div>

          <div>
            <Label
              htmlFor="recurring-tax-treatment"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Tax Treatment
            </Label>
            <Input
              id="recurring-tax-treatment"
              type="text"
              value={taxTreatmentLabel}
              readOnly
              aria-describedby="tax-treatment-hint"
              className="h-10 px-3.5 text-sm opacity-80"
            />
            <p id="tax-treatment-hint" className="mt-1 text-[11px] text-text-muted">
              Recomputed server-side for every generated invoice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
