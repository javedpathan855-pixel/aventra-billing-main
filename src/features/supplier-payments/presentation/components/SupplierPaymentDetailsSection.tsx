import Link from "next/link";
import { Mail, MapPin, Phone, Truck, WalletCards } from "lucide-react";
import {
  DatePicker,
  Input,
  Label,
  Select,
  Textarea,
} from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import {
  SUPPLIER_PAYMENT_METHODS,
  type SupplierPaymentMethod,
} from "../../domain/supplier-payment";

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

export type SupplierPaymentDetailsSectionProps = {
  selectedSupplier?: string;
  onSelectSupplier?: (supplier: SampleSupplier | null) => void;
  suppliers?: SampleSupplier[];
  error?: string;
  method?: SupplierPaymentMethod;
  onMethodChange?: (method: SupplierPaymentMethod) => void;
  amount?: number;
  onAmountChange?: (value: number) => void;
  paymentDate?: string;
  onPaymentDateChange?: (value: string) => void;
  reference?: string;
  onReferenceChange?: (value: string) => void;
  notes?: string;
  onNotesChange?: (value: string) => void;
  errors?: Record<string, string>;
};

export const SupplierPaymentDetailsSection = ({
  selectedSupplier = "",
  onSelectSupplier = () => {},
  suppliers = [],
  error,
  method = "Other",
  onMethodChange = () => {},
  amount = 0,
  onAmountChange = () => {},
  paymentDate = "",
  onPaymentDateChange = () => {},
  reference = "",
  onReferenceChange = () => {},
  notes = "",
  onNotesChange = () => {},
  errors = {},
}: SupplierPaymentDetailsSectionProps) => {
  const matched = suppliers.find((s) => s.name === selectedSupplier) || null;

  const supplierOptions = suppliers.map((s) => ({
    value: s.name,
    label: s.gstin ? `${s.name} (${s.gstin})` : s.name,
  }));

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <WalletCards size={18} className="text-primary-light" />
        <h2 className="text-base font-semibold text-text-primary">
          Payment &amp; Supplier Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="sp-supplier">Supplier *</Label>
          <Select
            id="sp-supplier"
            value={selectedSupplier}
            onChange={(val) => {
              const found = suppliers.find((s) => s.name === val) || null;
              onSelectSupplier(found);
            }}
            options={[{ value: "", label: "Select supplier..." }, ...supplierOptions]}
            className="mt-1.5"
          />
          {(error || errors.supplier || errors.supplierId) && (
            <p className="mt-1 text-xs text-danger">
              {error || errors.supplier || errors.supplierId}
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
          <Label htmlFor="sp-method">Payment Method *</Label>
          <Select
            id="sp-method"
            value={method}
            onChange={(val) => onMethodChange(val as SupplierPaymentMethod)}
            options={SUPPLIER_PAYMENT_METHODS.map((m) => ({
              value: m,
              label: m,
            }))}
            className="mt-1.5"
          />
          {errors.method && (
            <p className="mt-1 text-xs text-danger">{errors.method}</p>
          )}
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
          Select a supplier to preview their contact snapshot and list their
          outstanding bills below.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="sp-amount">Payment Amount (₹) *</Label>
          <Input
            id="sp-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount === 0 ? "" : amount}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onAmountChange(isNaN(val) ? 0 : Math.max(0, val));
            }}
            placeholder="0.00"
            startIcon={<span className="text-xs">₹</span>}
            className="mt-1.5 tabular-nums"
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-danger">{errors.amount}</p>
          )}
        </div>
        <div>
          <Label htmlFor="sp-payment-date">Payment Date *</Label>
          <DatePicker
            id="sp-payment-date"
            value={paymentDate}
            onChange={onPaymentDateChange}
            className="mt-1.5"
          />
          {errors.paymentDate && (
            <p className="mt-1 text-xs text-danger">{errors.paymentDate}</p>
          )}
        </div>
        <div>
          <Label htmlFor="sp-reference">Reference / Txn #</Label>
          <Input
            id="sp-reference"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            placeholder="e.g. UTR, cheque #"
            className="mt-1.5 font-mono"
          />
          {errors.reference && (
            <p className="mt-1 text-xs text-danger">{errors.reference}</p>
          )}
        </div>
        <div>
          <Label htmlFor="sp-notes">Notes</Label>
          <Textarea
            id="sp-notes"
            rows={1}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Optional payment notes..."
            className="mt-1.5"
          />
        </div>
      </div>
    </section>
  );
};
