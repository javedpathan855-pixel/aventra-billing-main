import Link from "next/link";
import { Mail, MapPin, Phone, ReceiptText, Truck } from "lucide-react";
import { DatePicker, Input, Label, Select } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type { PurchaseOrder } from "@/features/purchase-orders";

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

export type PurchaseBillSupplierSectionProps = {
  selectedSupplier?: string;
  onSelectSupplier?: (supplier: SampleSupplier | null) => void;
  suppliers?: SampleSupplier[];
  error?: string;
  billNumber?: string;
  onBillNumberChange?: (value: string) => void;
  supplierInvoiceNumber?: string;
  onSupplierInvoiceNumberChange?: (value: string) => void;
  supplierInvoiceDate?: string;
  onSupplierInvoiceDateChange?: (value: string) => void;
  billDate?: string;
  onBillDateChange?: (value: string) => void;
  dueDate?: string;
  onDueDateChange?: (value: string) => void;
  purchaseOrders?: PurchaseOrder[];
  selectedPurchaseOrderId?: string;
  onSelectPurchaseOrder?: (order: PurchaseOrder | null) => void;
  paymentTerms?: string;
  onPaymentTermsChange?: (value: string) => void;
  errors?: Record<string, string>;
};

export const PurchaseBillSupplierSection = ({
  selectedSupplier = "",
  onSelectSupplier = () => {},
  suppliers = [],
  error,
  billNumber = "",
  onBillNumberChange = () => {},
  supplierInvoiceNumber = "",
  onSupplierInvoiceNumberChange = () => {},
  supplierInvoiceDate = "",
  onSupplierInvoiceDateChange = () => {},
  billDate = "",
  onBillDateChange = () => {},
  dueDate = "",
  onDueDateChange = () => {},
  purchaseOrders = [],
  selectedPurchaseOrderId = "",
  onSelectPurchaseOrder = () => {},
  paymentTerms = "",
  onPaymentTermsChange = () => {},
  errors = {},
}: PurchaseBillSupplierSectionProps) => {
  const matched = suppliers.find((s) => s.name === selectedSupplier) || null;
  const matchedSupplierId = matched?.id || null;

  const supplierOptions = suppliers.map((s) => ({
    value: s.name,
    label: s.gstin ? `${s.name} (${s.gstin})` : s.name,
  }));

  const eligibleOrders = purchaseOrders.filter(
    (o) =>
      o.status !== "Cancelled" &&
      (matchedSupplierId
        ? o.supplierId === matchedSupplierId
        : !o.supplierId),
  );

  const orderOptions = eligibleOrders.map((o) => ({
    value: o.id,
    label: `${o.orderNumber} (${o.status})`,
  }));

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <ReceiptText size={18} className="text-primary-light" />
        <h2 className="text-base font-semibold text-text-primary">
          Bill &amp; Supplier Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="pb-supplier">Supplier *</Label>
          <Select
            id="pb-supplier"
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
          <Label htmlFor="pb-bill-number">Purchase Bill Number</Label>
          <Input
            id="pb-bill-number"
            value={billNumber}
            onChange={(e) => onBillNumberChange(e.target.value)}
            placeholder="Auto-generated from Purchase Settings"
            className="mt-1.5 font-mono"
          />
          {errors.billNumber && (
            <p className="mt-1 text-xs text-danger">{errors.billNumber}</p>
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
          snapshot is stored on the bill and survives later supplier edits.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="pb-supplier-invoice">Supplier Invoice #</Label>
          <Input
            id="pb-supplier-invoice"
            value={supplierInvoiceNumber}
            onChange={(e) => onSupplierInvoiceNumberChange(e.target.value)}
            placeholder="e.g. INV-2026-118"
            className="mt-1.5 font-mono"
          />
          {errors.supplierInvoiceNumber && (
            <p className="mt-1 text-xs text-danger">
              {errors.supplierInvoiceNumber}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="pb-supplier-invoice-date">Supplier Invoice Date</Label>
          <DatePicker
            id="pb-supplier-invoice-date"
            value={supplierInvoiceDate}
            onChange={onSupplierInvoiceDateChange}
            className="mt-1.5"
          />
          {errors.supplierInvoiceDate && (
            <p className="mt-1 text-xs text-danger">
              {errors.supplierInvoiceDate}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="pb-bill-date">Bill Date *</Label>
          <DatePicker
            id="pb-bill-date"
            value={billDate}
            onChange={onBillDateChange}
            className="mt-1.5"
          />
          {errors.billDate && (
            <p className="mt-1 text-xs text-danger">{errors.billDate}</p>
          )}
        </div>
        <div>
          <Label htmlFor="pb-due-date">Due Date *</Label>
          <DatePicker
            id="pb-due-date"
            value={dueDate}
            onChange={onDueDateChange}
            minDate={billDate || undefined}
            className="mt-1.5"
          />
          {errors.dueDate && (
            <p className="mt-1 text-xs text-danger">{errors.dueDate}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="pb-purchase-order">
            Linked Purchase Order (Optional)
          </Label>
          <Select
            id="pb-purchase-order"
            value={selectedPurchaseOrderId}
            onChange={(val) => {
              const found = purchaseOrders.find((o) => o.id === val) || null;
              onSelectPurchaseOrder(found);
            }}
            options={[
              { value: "", label: "No linked order..." },
              ...orderOptions,
            ]}
            className="mt-1.5"
          />
          {errors.purchaseOrderId && (
            <p className="mt-1 text-xs text-danger">{errors.purchaseOrderId}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            {eligibleOrders.length > 0
              ? "Selecting an order prefills its supplier lines; totals are always recomputed."
              : "Select a supplier first to see their open purchase orders."}
          </p>
        </div>
        <div>
          <Label htmlFor="pb-payment-terms">Payment Terms</Label>
          <Input
            id="pb-payment-terms"
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
