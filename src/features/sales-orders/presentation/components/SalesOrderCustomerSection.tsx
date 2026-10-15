import Link from "next/link";
import {
  Globe,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { DatePicker, Input, Label, Select } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";

export type SampleCustomer = {
  id?: string;
  name: string;
  email: string;
  address: string;
  gstin: string;
  phone?: string;
  contactPerson?: string;
  pan?: string;
  state?: string;
  placeOfSupply?: string;
  gstTreatment?: string;
  paymentTerms?: string;
};

export type SalesOrderCustomerSectionProps = {
  selectedCustomer?: string;
  onSelectCustomer?: (customer: SampleCustomer | null) => void;
  customers?: SampleCustomer[];
  error?: string;
  orderNumber?: string;
  onOrderNumberChange?: (val: string) => void;
  orderDate?: string;
  onOrderDateChange?: (val: string) => void;
  expectedDeliveryDate?: string;
  onExpectedDeliveryDateChange?: (val: string) => void;
  referenceNumber?: string;
  onReferenceNumberChange?: (val: string) => void;
  errors?: Record<string, string>;
};

export const SalesOrderCustomerSection = ({
  selectedCustomer = "",
  onSelectCustomer = () => {},
  customers = [],
  error,
  orderNumber = "",
  onOrderNumberChange = () => {},
  orderDate = "",
  onOrderDateChange = () => {},
  expectedDeliveryDate = "",
  onExpectedDeliveryDateChange = () => {},
  referenceNumber = "",
  onReferenceNumberChange = () => {},
  errors = {},
}: SalesOrderCustomerSectionProps) => {
  const current = customers.find((c) => c.name === selectedCustomer);
  const customerError = error || errors.customer || errors.customerName;

  const handleCustomerSelect = (val: string) => {
    const match = customers.find((c) => c.name === val) || null;
    onSelectCustomer(match);
  };

  const phone = current?.phone || "—";
  const contactPerson = current?.contactPerson || "—";
  const pan = current?.pan || "—";
  const state = current?.placeOfSupply || current?.state || "—";

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-6">
      {/* 1. Section Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
          aria-hidden="true"
        >
          <ShoppingCart size={19} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
            Order &amp; Customer Details
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Select a customer and specify order dates and commercial references.
          </p>
        </div>
      </div>

      {/* 2. Customer Section: Selector + Comprehensive Details Card Below */}
      <div className="space-y-4">
        {/* Customer Select Dropdown */}
        <div className="w-full max-w-2xl">
          <div className="mb-1.5 flex items-center justify-between">
            <Label
              htmlFor="sales-order-customer-select"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Customer <span className="text-danger">*</span>
            </Label>
            <Link
              href="/customers/new"
              target="_blank"
              className="text-xs font-semibold text-primary-light hover:text-primary transition-colors"
            >
              + Add Customer
            </Link>
          </div>

          <div className="relative">
            <Select
              id="sales-order-customer-select"
              value={selectedCustomer}
              onChange={handleCustomerSelect}
              options={[
                { value: "", label: "Search or select a customer..." },
                ...customers.map((c) => ({
                  value: c.name,
                  label: c.gstin ? `${c.name} (${c.gstin})` : c.name,
                })),
              ]}
              className={cn(customerError && "border-danger focus:border-danger")}
            />
            <Search
              size={14}
              className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
          </div>
          {customerError && (
            <p className="mt-1 text-xs text-danger">{customerError}</p>
          )}
        </div>

        {/* Selected Customer Snapshot Card */}
        {current ? (
          <div className="rounded-xl border border-border/80 bg-surface-alt/40 p-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary text-sm sm:text-base">
                  {current.name}
                </span>
                {current.gstTreatment && (
                  <span className="rounded-full bg-surface-card border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    {current.gstTreatment.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {current.gstin ? (
                  <span className="rounded bg-surface-card px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary border border-border/60">
                    GSTIN: {current.gstin}
                  </span>
                ) : (
                  <span className="text-text-muted text-[11px]">Unregistered</span>
                )}
                {pan !== "—" && (
                  <span className="rounded bg-surface-card px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary border border-border/60">
                    PAN: {pan}
                  </span>
                )}
                {current.paymentTerms && (
                  <span className="rounded bg-surface-card px-2 py-0.5 text-[11px] font-medium text-text-secondary border border-border/60">
                    Terms: {current.paymentTerms}
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
                    {current.email || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Contact Phone
                  </span>
                  <span className="text-text-primary font-medium block">
                    {phone} {contactPerson !== "—" ? `(${contactPerson})` : ""}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Globe size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <div className="min-w-0">
                  <span className="text-text-muted block text-[10px] uppercase tracking-wider font-medium">
                    Place of Supply
                  </span>
                  <span className="text-text-primary font-medium block">
                    {state}
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
                    {current.address || "No billing address provided"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface-alt/20 p-4 text-center">
            <Users size={20} className="mx-auto text-text-muted mb-1" />
            <p className="text-xs text-text-secondary">
              No customer selected yet. Choose a customer from the dropdown above to load address snapshots and GST details.
            </p>
          </div>
        )}
      </div>

      {/* 3. Parameter Fields Row: Order #, Order Date, Delivery Date, PO/Ref # */}
      <div className="border-t border-border/80 pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label
              htmlFor="sales-order-number"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Order Number <span className="text-danger">*</span>
            </Label>
            <div className="mt-1.5">
              <Input
                id="sales-order-number"
                type="text"
                value={orderNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onOrderNumberChange(e.target.value)
                }
                placeholder="SO-0001"
                className={`font-mono text-sm ${
                  errors.orderNumber ? "border-danger focus:border-danger" : ""
                }`}
              />
              {errors.orderNumber && (
                <p className="mt-1 text-xs text-danger">{errors.orderNumber}</p>
              )}
            </div>
          </div>

          <div>
            <Label
              htmlFor="sales-order-date"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Order Date <span className="text-danger">*</span>
            </Label>
            <div className="mt-1.5">
              <DatePicker
                id="sales-order-date"
                value={orderDate}
                onChange={onOrderDateChange}
                className={cn(errors.orderDate && "border-danger focus:border-danger")}
              />
              {errors.orderDate && (
                <p className="mt-1 text-xs text-danger">{errors.orderDate}</p>
              )}
            </div>
          </div>

          <div>
            <Label
              htmlFor="sales-order-delivery-date"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Expected Delivery
            </Label>
            <div className="mt-1.5">
              <DatePicker
                id="sales-order-delivery-date"
                value={expectedDeliveryDate}
                onChange={onExpectedDeliveryDateChange}
                className={
                  errors.expectedDeliveryDate
                    ? "border-danger focus:border-danger"
                    : ""
                }
              />
              {errors.expectedDeliveryDate && (
                <p className="mt-1 text-xs text-danger">
                  {errors.expectedDeliveryDate}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label
              htmlFor="sales-order-reference-number"
              className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
            >
              Customer PO / Ref #
            </Label>
            <div className="mt-1.5">
              <Input
                id="sales-order-reference-number"
                type="text"
                value={referenceNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onReferenceNumberChange(e.target.value)
                }
                placeholder="e.g. PO-84920"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
