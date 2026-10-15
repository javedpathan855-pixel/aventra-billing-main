import Link from "next/link";
import { Mail, MapPin, Phone, ShoppingCart, Truck } from "lucide-react";
import { DatePicker, Input, Label, Select } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";

export type SampleSupplier = {
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

export type PurchaseOrderSupplierSectionProps = {
  selectedSupplier?: string;
  onSelectSupplier?: (supplier: SampleSupplier | null) => void;
  suppliers?: SampleSupplier[];
  error?: string;
  orderNumber?: string;
  onOrderNumberChange?: (value: string) => void;
  orderDate?: string;
  onOrderDateChange?: (value: string) => void;
  expectedDeliveryDate?: string;
  onExpectedDeliveryDateChange?: (value: string) => void;
  referenceNumber?: string;
  onReferenceNumberChange?: (value: string) => void;
  paymentTerms?: string;
  onPaymentTermsChange?: (value: string) => void;
  errors?: Record<string, string>;
};

export const PurchaseOrderSupplierSection = ({
  selectedSupplier = "",
  onSelectSupplier = () => {},
  suppliers = [],
  error,
  orderNumber = "",
  onOrderNumberChange = () => {},
  orderDate = "",
  onOrderDateChange = () => {},
  expectedDeliveryDate = "",
  onExpectedDeliveryDateChange = () => {},
  referenceNumber = "",
  onReferenceNumberChange = () => {},
  paymentTerms = "",
  onPaymentTermsChange = () => {},
  errors = {},
}: PurchaseOrderSupplierSectionProps) => {
  const matched = suppliers.find((s) => s.name === selectedSupplier) || null;

  const supplierOptions = suppliers.map((s) => ({
    value: s.name,
    label: s.gstin ? `${s.name} (${s.gstin})` : s.name,
  }));

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <ShoppingCart size={18} className="text-primary-light" />
        <h2 className="text-base font-semibold text-text-primary">
          Order &amp; Supplier Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="po-supplier">Supplier *</Label>
          <Select
            id="po-supplier"
            value={selectedSupplier}
            onChange={(val) => {
              const found = suppliers.find((s) => s.name === val) || null;
              onSelectSupplier(found);
            }}
            options={[{ value: "", label: "Select supplier..." }, ...supplierOptions]}
            className="mt-1.5"
          />
          {(error || errors.supplier || errors.supplierName) && (
            <p className="mt-1 text-xs text-danger">
              {error || errors.supplier || errors.supplierName}
            </p>
          )}
          <Link
            href="/suppliers/new"
            className="mt-1.5 inline-block text-xs font-medium text-primary-light hover:underline"
          >
            + Add Supplier
          </Link>
        </div>

        <div>
          <Label htmlFor="po-order-number">Purchase Order Number</Label>
          <Input
            id="po-order-number"
            value={orderNumber}
            onChange={(e) => onOrderNumberChange(e.target.value)}
            placeholder="Auto-generated from Purchase Settings"
            className="mt-1.5 font-mono"
          />
          {errors.orderNumber && (
            <p className="mt-1 text-xs text-danger">{errors.orderNumber}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Leave as-is to use the configured sequence, or enter a custom number.
          </p>
        </div>
      </div>

      {matched ? (
        <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-text-primary text-sm">
              {matched.name}
            </span>
            {matched.gstTreatment && (
              <span
                className={cn(
                  "rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary",
                )}
              >
                {matched.gstTreatment}
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="flex items-start gap-1.5">
              <Mail size={13} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <div className="text-text-muted">Email</div>
                <div className="text-text-primary">{matched.email || "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Phone size={13} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <div className="text-text-muted">Phone</div>
                <div className="text-text-primary">{matched.phone || "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Truck size={13} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <div className="text-text-muted">GSTIN</div>
                <div className="text-text-primary font-mono">
                  {matched.gstin || "—"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <MapPin size={13} className="text-text-muted mt-0.5 shrink-0" />
              <div>
                <div className="text-text-muted">Address</div>
                <div className="text-text-primary">{matched.address || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
          Select a supplier to preview their contact and tax snapshot. The
          snapshot is stored on the order and survives later supplier edits.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="po-order-date">Order Date *</Label>
          <DatePicker
            id="po-order-date"
            value={orderDate}
            onChange={onOrderDateChange}
            className="mt-1.5"
          />
          {errors.orderDate && (
            <p className="mt-1 text-xs text-danger">{errors.orderDate}</p>
          )}
        </div>
        <div>
          <Label htmlFor="po-delivery-date">Expected Delivery</Label>
          <DatePicker
            id="po-delivery-date"
            value={expectedDeliveryDate}
            onChange={onExpectedDeliveryDateChange}
            className="mt-1.5"
          />
          {errors.expectedDeliveryDate && (
            <p className="mt-1 text-xs text-danger">
              {errors.expectedDeliveryDate}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="po-reference">Supplier Reference</Label>
          <Input
            id="po-reference"
            value={referenceNumber}
            onChange={(e) => onReferenceNumberChange(e.target.value)}
            placeholder="Supplier quote / ref #"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="po-payment-terms">Payment Terms</Label>
          <Input
            id="po-payment-terms"
            value={paymentTerms}
            onChange={(e) => onPaymentTermsChange(e.target.value)}
            placeholder="Net 30 days"
            className="mt-1.5"
          />
        </div>
      </div>
    </section>
  );
};
