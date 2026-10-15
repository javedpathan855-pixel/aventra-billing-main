import Link from "next/link";
import { Mail, MapPin, Phone, Truck, Undo2 } from "lucide-react";
import { DatePicker, Input, Label, Select, Textarea } from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type { ReturnableBill } from "../../domain/entities/purchase-return";
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

export type PurchaseReturnSupplierSectionProps = {
  selectedSupplier?: string;
  onSelectSupplier?: (supplier: SampleSupplier | null) => void;
  suppliers?: SampleSupplier[];
  error?: string;
  returnNumber?: string;
  onReturnNumberChange?: (value: string) => void;
  returnableBills?: ReturnableBill[];
  selectedBillId?: string;
  onSelectBill?: (bill: ReturnableBill | null) => void;
  purchaseOrders?: PurchaseOrder[];
  selectedPurchaseOrderId?: string;
  onSelectPurchaseOrder?: (order: PurchaseOrder | null) => void;
  returnDate?: string;
  onReturnDateChange?: (value: string) => void;
  reason?: string;
  onReasonChange?: (value: string) => void;
  errors?: Record<string, string>;
};

export const PurchaseReturnSupplierSection = ({
  selectedSupplier = "",
  onSelectSupplier = () => {},
  suppliers = [],
  error,
  returnNumber = "",
  onReturnNumberChange = () => {},
  returnableBills = [],
  selectedBillId = "",
  onSelectBill = () => {},
  purchaseOrders = [],
  selectedPurchaseOrderId = "",
  onSelectPurchaseOrder = () => {},
  returnDate = "",
  onReturnDateChange = () => {},
  reason = "",
  onReasonChange = () => {},
  errors = {},
}: PurchaseReturnSupplierSectionProps) => {
  const matched = suppliers.find((s) => s.name === selectedSupplier) || null;
  const matchedSupplierId = matched?.id || null;

  const supplierOptions = suppliers.map((s) => ({
    value: s.name,
    label: s.gstin ? `${s.name} (${s.gstin})` : s.name,
  }));

  const eligibleBills = returnableBills.filter(
    (b) =>
      !matchedSupplierId ||
      !b.supplierId ||
      b.supplierId === matchedSupplierId,
  );

  const billOptions = eligibleBills.map((b) => ({
    value: b.id,
    label: `${b.billNumber} (${b.billDate})`,
  }));

  const eligibleOrders = purchaseOrders.filter(
    (o) =>
      o.status !== "Cancelled" &&
      (!matchedSupplierId || !o.supplierId || o.supplierId === matchedSupplierId),
  );

  const orderOptions = eligibleOrders.map((o) => ({
    value: o.id,
    label: `${o.orderNumber} (${o.status})`,
  }));

  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Undo2 size={18} className="text-primary-light" />
        <h2 className="text-base font-semibold text-text-primary">
          Return &amp; Supplier Details
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="pr-supplier">Supplier *</Label>
          <Select
            id="pr-supplier"
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
          <Label htmlFor="pr-return-number">Purchase Return Number</Label>
          <Input
            id="pr-return-number"
            value={returnNumber}
            onChange={(e) => onReturnNumberChange(e.target.value)}
            placeholder="Auto-generated from Purchase Settings"
            className="mt-1.5 font-mono"
          />
          {errors.returnNumber && (
            <p className="mt-1 text-xs text-danger">{errors.returnNumber}</p>
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
          snapshot is stored on the return and survives later supplier edits.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="pr-bill">Source Purchase Bill (Optional)</Label>
          <Select
            id="pr-bill"
            value={selectedBillId}
            onChange={(val) => {
              const found = returnableBills.find((b) => b.id === val) || null;
              onSelectBill(found);
            }}
            options={[{ value: "", label: "Manual return (no bill)..." }, ...billOptions]}
            className="mt-1.5"
          />
          {errors.purchaseBillId && (
            <p className="mt-1 text-xs text-danger">{errors.purchaseBillId}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            {eligibleBills.length > 0
              ? "Selecting a bill prefills its supplier lines with remaining quantities."
              : "Only posted bills with returnable quantities are listed."}
          </p>
        </div>

        <div>
          <Label htmlFor="pr-order">Source Purchase Order (Optional)</Label>
          <Select
            id="pr-order"
            value={selectedPurchaseOrderId}
            onChange={(val) => {
              const found = purchaseOrders.find((o) => o.id === val) || null;
              onSelectPurchaseOrder(found);
            }}
            options={[{ value: "", label: "No linked order..." }, ...orderOptions]}
            className="mt-1.5"
          />
          {errors.purchaseOrderId && (
            <p className="mt-1 text-xs text-danger">{errors.purchaseOrderId}</p>
          )}
          <p className="mt-1 text-xs text-text-muted">
            Links the return to its original order for traceability.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <Label htmlFor="pr-return-date">Return Date *</Label>
          <DatePicker
            id="pr-return-date"
            value={returnDate}
            onChange={onReturnDateChange}
            className="mt-1.5"
          />
          {errors.returnDate && (
            <p className="mt-1 text-xs text-danger">{errors.returnDate}</p>
          )}
        </div>
        <div>
          <Label htmlFor="pr-reason">Return Reason *</Label>
          <Textarea
            id="pr-reason"
            rows={2}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Defective or damaged in transit"
            className="mt-1.5"
          />
          {errors.reason && (
            <p className="mt-1 text-xs text-danger">{errors.reason}</p>
          )}
        </div>
      </div>
    </section>
  );
};
