"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierDto } from "@/features/suppliers";
import type { ProductDto } from "@/features/products";
import type { PurchaseOrder } from "@/features/purchase-orders";
import type { PurchaseSettings } from "@/features/purchase-settings";
import {
  calculatePurchaseBillTotals,
  calculateDefaultDueDate,
  getTodayDateString,
  validatePurchaseBillLines,
  validatePurchaseBillDates,
} from "../../domain/rules/purchase-bill-rules";
import { determineTaxMode } from "@/features/invoices";
import type {
  PurchaseBill,
  PurchaseBillItem,
  PurchaseBillStatus,
} from "../../domain/entities/purchase-bill";
import { formatSupplierAddress } from "@/features/suppliers";
import {
  createPurchaseBillAction,
  updatePurchaseBillAction,
} from "../../data/mutations/purchase-bill-mutations";
import {
  PurchaseBillSupplierSection,
  type SampleSupplier,
} from "../components/PurchaseBillSupplierSection";
import { PurchaseBillItemsSection } from "../components/PurchaseBillItemsSection";
import { PurchaseBillAdditionalChargesAndDiscountSection } from "../components/PurchaseBillAdditionalChargesAndDiscountSection";
import { PurchaseBillSummarySection } from "../components/PurchaseBillSummarySection";
import { PurchaseBillAdditionalInfoSection } from "../components/PurchaseBillAdditionalInfoSection";
import { PurchaseBillDocument } from "../components/PurchaseBillDocument";
import { PurchaseBillStatusBadge } from "../components/PurchaseBillStatusBadge";
import { Button } from "@/shared/components/form";

const initialLine = (id = "line-1"): PurchaseBillItem => ({
  id,
  item: "",
  description: "",
  hsnSac: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 18,
  taxableAmount: 0,
  taxAmount: 0,
  lineTotal: 0,
  sortOrder: 0,
});

const lineFromPurchaseOrder = (
  it: PurchaseOrder["items"][number],
  idx: number,
): PurchaseBillItem => ({
  id: `line-${idx + 1}`,
  productId: it.productId || undefined,
  item: it.item,
  description: it.description || "",
  hsnSac: it.hsnSac || "",
  quantity: it.quantity,
  unitPrice: it.unitPrice,
  discount: it.discount || 0,
  taxRate: it.taxRate ?? 18,
  taxableAmount: 0,
  taxAmount: 0,
  lineTotal: 0,
  sortOrder: idx,
});

export type PurchaseBillCreatePageProps = {
  initialSuppliers?: SupplierDto[];
  initialProducts?: ProductDto[];
  initialPurchaseOrders?: PurchaseOrder[];
  organizationState?: string;
  organizationName?: string;
  initialBill?: PurchaseBill;
  purchaseSettings?: PurchaseSettings;
};

export const PurchaseBillCreatePage = ({
  initialSuppliers = [],
  initialProducts = [],
  initialPurchaseOrders = [],
  organizationState = "27-Maharashtra",
  organizationName,
  initialBill,
  purchaseSettings,
}: PurchaseBillCreatePageProps) => {
  const router = useRouter();

  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formattedSuppliers: SampleSupplier[] = useMemo(() => {
    return initialSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email || "",
      address: formatSupplierAddress(s.billingAddress),
      gstin: s.gstin || "",
      phone: s.phone || undefined,
      contactPerson: s.contactPerson || undefined,
      pan: s.pan || undefined,
      state: s.billingAddress.state,
      placeOfSupply: s.billingAddress.state || "",
      gstTreatment: s.gstTreatment,
      paymentTerms: s.paymentTerms || undefined,
    }));
  }, [initialSuppliers]);

  const defaultBillDate = initialBill?.billDate || getTodayDateString();
  const dueDays = purchaseSettings?.defaultDueDays || 30;
  const defaultDueDate =
    initialBill?.dueDate || calculateDefaultDueDate(defaultBillDate, dueDays);

  const previewBillNumber =
    initialBill?.billNumber ||
    (purchaseSettings
      ? `${purchaseSettings.purchaseBillPrefix}${String(purchaseSettings.purchaseBillNextNumber).padStart(purchaseSettings.purchaseBillPadding, "0")}${purchaseSettings.purchaseBillSuffix || ""}`
      : "PB-0001");

  const [bill, setBill] = useState<PurchaseBill>(() => {
    if (initialBill) return initialBill;

    return {
      id: "",
      organizationId: "",
      billNumber: previewBillNumber,
      supplierId: "",
      supplierName: "",
      supplierEmail: "",
      supplierAddress: "",
      supplierGstin: "",
      supplierPlaceOfSupply: "",
      supplierInvoiceNumber: "",
      supplierInvoiceDate: "",
      purchaseOrderId: "",
      purchaseOrderNumber: "",
      billDate: defaultBillDate,
      dueDate: defaultDueDate,
      status: "Draft",
      taxMode: "CGST_SGST",
      currency: "INR (₹)",
      paymentTerms: purchaseSettings?.defaultPaymentTerms || "",
      notes: purchaseSettings?.defaultPurchaseBillNotes || "",
      terms: purchaseSettings?.defaultPurchaseBillTerms || "",
      additionalCharges: 0,
      additionalChargesLabel: "",
      additionalDiscount: 0,
      additionalDiscountType: "fixed",
      additionalDiscountLabel: "",
      subtotal: 0,
      lineDiscountTotal: 0,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
      total: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [initialLine("line-1")],
    };
  });

  const totals = calculatePurchaseBillTotals({
    items: bill.items,
    taxMode: bill.taxMode,
    additionalCharges: bill.additionalCharges,
    additionalDiscount: bill.additionalDiscount,
    additionalDiscountType: bill.additionalDiscountType,
  });

  const update = (patch: Partial<PurchaseBill>) =>
    setBill((prev) => ({ ...prev, ...patch }));

  const handleSupplierSelect = (supplier: SampleSupplier | null) => {
    if (!supplier) {
      update({
        supplierId: "",
        supplierName: "",
        supplierEmail: "",
        supplierAddress: "",
        supplierGstin: "",
        supplierPlaceOfSupply: "",
        purchaseOrderId: "",
        purchaseOrderNumber: "",
      });
      return;
    }

    const supplierPlace = supplier.placeOfSupply || supplier.state || "";
    const taxDecision = determineTaxMode({
      supplierState: organizationState,
      customerPlaceOfSupply: supplierPlace,
    });
    const derivedTaxMode = taxDecision.taxMode;

    update({
      supplierId: supplier.id || null,
      supplierName: supplier.name,
      supplierEmail: supplier.email || "",
      supplierAddress: supplier.address || "",
      supplierGstin: supplier.gstin || "",
      supplierPlaceOfSupply: supplierPlace,
      taxMode: derivedTaxMode,
      paymentTerms: bill.paymentTerms || supplier.paymentTerms || "",
      purchaseOrderId: "",
      purchaseOrderNumber: "",
    });
  };

  const handlePurchaseOrderSelect = (order: PurchaseOrder | null) => {
    if (!order) {
      update({ purchaseOrderId: "", purchaseOrderNumber: "" });
      return;
    }

    update({
      purchaseOrderId: order.id,
      purchaseOrderNumber: order.orderNumber,
      supplierId: order.supplierId || bill.supplierId,
      supplierName: order.supplierName || bill.supplierName,
      supplierEmail: order.supplierEmail || bill.supplierEmail,
      supplierAddress: order.supplierAddress || bill.supplierAddress,
      supplierGstin: order.supplierGstin || bill.supplierGstin,
      supplierPlaceOfSupply:
        order.supplierPlaceOfSupply || bill.supplierPlaceOfSupply,
      taxMode: order.taxMode || bill.taxMode,
      paymentTerms: bill.paymentTerms || order.paymentTerms || "",
      items: order.items.map(lineFromPurchaseOrder),
    });
  };

  const handleAddLine = () => {
    setBill((prev) => ({
      ...prev,
      items: [...prev.items, initialLine(`line-${prev.items.length + 1}`)],
    }));
  };

  const handleUpdateLine = (id: string, patch: Partial<PurchaseBillItem>) => {
    setBill((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const handleRemoveLine = (id: string) => {
    setBill((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleSave = async (submitStatus: PurchaseBillStatus = "Draft") => {
    setSubmitError(null);
    const newErrors: Record<string, string> = {};

    if (!bill.supplierName.trim()) {
      newErrors.supplier = "Please select or enter a supplier.";
    }

    try {
      validatePurchaseBillLines(bill.items);
    } catch (err: unknown) {
      newErrors.items =
        err instanceof Error ? err.message : "Invalid items in purchase bill.";
    }

    try {
      validatePurchaseBillDates(bill.billDate, bill.dueDate);
    } catch (err: unknown) {
      newErrors.dueDate =
        err instanceof Error ? err.message : "Invalid bill dates.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      setSubmitError(newErrors[firstKey]);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        billNumber: bill.billNumber,
        supplierId: bill.supplierId || null,
        supplierName: bill.supplierName,
        supplierEmail: bill.supplierEmail || null,
        supplierAddress: bill.supplierAddress || null,
        supplierGstin: bill.supplierGstin || null,
        supplierPlaceOfSupply: bill.supplierPlaceOfSupply || null,
        supplierInvoiceNumber: bill.supplierInvoiceNumber || null,
        supplierInvoiceDate: bill.supplierInvoiceDate || null,
        purchaseOrderId: bill.purchaseOrderId || null,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        status: submitStatus,
        taxMode: bill.taxMode,
        currency: bill.currency,
        paymentTerms: bill.paymentTerms || null,
        notes: bill.notes || null,
        terms: bill.terms || null,
        additionalCharges: bill.additionalCharges,
        additionalChargesLabel: bill.additionalChargesLabel || null,
        additionalDiscount: bill.additionalDiscount,
        additionalDiscountType: bill.additionalDiscountType,
        additionalDiscountLabel: bill.additionalDiscountLabel || null,
        items: bill.items.map((it) => ({
          productId: it.productId || null,
          item: it.item,
          description: it.description || null,
          hsnSac: it.hsnSac || null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
        })),
      };

      if (initialBill?.id) {
        const res = await updatePurchaseBillAction(initialBill.id, payload);
        if (!res.success) {
          throw new Error(res.error || "Failed to update purchase bill.");
        }
        router.push(`/purchase-bills/${initialBill.id}`);
      } else {
        const res = await createPurchaseBillAction(payload);
        if (!res.success) {
          throw new Error(res.error || "Failed to create purchase bill.");
        }
        if (!res.data) {
          throw new Error("Failed to create purchase bill.");
        }
        router.push(`/purchase-bills/${res.data.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save bill.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {initialBill ? "Edit Purchase Bill" : "Create Purchase Bill"}
            </h1>
            <PurchaseBillStatusBadge status={bill.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Record supplier invoices with tax-accurate totals. Internal
            numbering and defaults come from Purchase Settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPreview((prev) => !prev)}
            className="h-10 px-4 text-sm font-medium"
          >
            <Eye size={16} className="text-text-muted" />
            <span>{preview ? "Hide Preview" : "Preview Document"}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSave("Draft")}
            disabled={isSubmitting}
            className="h-10 px-4 text-sm font-medium"
          >
            <Calendar size={16} className="text-text-muted" />
            <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave("Confirmed")}
            disabled={isSubmitting}
            className="h-10 px-4 text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            <span>
              {isSubmitting
                ? "Saving..."
                : initialBill
                  ? "Update Bill"
                  : "Confirm & Save Bill"}
            </span>
          </Button>
        </div>
      </div>

      {submitError && (
        <div
          className="flex items-center justify-between rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
          role="alert"
        >
          <span>{submitError}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => setSubmitError(null)}
            className="h-auto p-1 text-danger hover:text-danger/80"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {preview ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-4">
            <span className="text-sm font-medium text-text-primary">
              Showing live document preview of this purchase bill.
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreview(false)}
              className="h-9 px-3.5 text-xs font-semibold"
            >
              Back to Form Editor
            </Button>
          </div>
          <PurchaseBillDocument bill={bill} organizationName={organizationName} />
        </div>
      ) : (
        <div className="space-y-6">
          <PurchaseBillSupplierSection
            selectedSupplier={bill.supplierName}
            onSelectSupplier={handleSupplierSelect}
            suppliers={formattedSuppliers}
            billNumber={bill.billNumber}
            onBillNumberChange={(val) => update({ billNumber: val })}
            supplierInvoiceNumber={bill.supplierInvoiceNumber || ""}
            onSupplierInvoiceNumberChange={(val) =>
              update({ supplierInvoiceNumber: val })
            }
            supplierInvoiceDate={bill.supplierInvoiceDate || ""}
            onSupplierInvoiceDateChange={(val) =>
              update({ supplierInvoiceDate: val })
            }
            billDate={bill.billDate}
            onBillDateChange={(val) => update({ billDate: val })}
            dueDate={bill.dueDate}
            onDueDateChange={(val) => update({ dueDate: val })}
            purchaseOrders={initialPurchaseOrders}
            selectedPurchaseOrderId={bill.purchaseOrderId || ""}
            onSelectPurchaseOrder={handlePurchaseOrderSelect}
            paymentTerms={bill.paymentTerms || ""}
            onPaymentTermsChange={(val) => update({ paymentTerms: val })}
            errors={errors}
          />

          <PurchaseBillItemsSection
            items={bill.items}
            onUpdateLine={handleUpdateLine}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            availableProducts={initialProducts}
            errors={errors}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] items-stretch">
            <PurchaseBillAdditionalChargesAndDiscountSection
              additionalCharges={bill.additionalCharges}
              onAdditionalChargesChange={(val) =>
                update({ additionalCharges: val })
              }
              additionalChargesLabel={bill.additionalChargesLabel || ""}
              onAdditionalChargesLabelChange={(val) =>
                update({ additionalChargesLabel: val })
              }
              additionalDiscount={bill.additionalDiscount}
              onAdditionalDiscountChange={(val) =>
                update({ additionalDiscount: val })
              }
              additionalDiscountType={bill.additionalDiscountType}
              onAdditionalDiscountTypeChange={(val) =>
                update({ additionalDiscountType: val })
              }
              additionalDiscountLabel={bill.additionalDiscountLabel || ""}
              onAdditionalDiscountLabelChange={(val) =>
                update({ additionalDiscountLabel: val })
              }
            />

            <PurchaseBillSummarySection
              totals={totals}
              taxMode={bill.taxMode}
              onTaxModeChange={(mode) => update({ taxMode: mode })}
            />
          </div>

          <PurchaseBillAdditionalInfoSection
            notes={bill.notes || ""}
            onNotesChange={(val) => update({ notes: val })}
            terms={bill.terms || ""}
            onTermsChange={(val) => update({ terms: val })}
          />

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
            <Link
              href="/purchase-bills"
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
            >
              <X size={15} />
              <span>Cancel</span>
            </Link>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSave("Draft")}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-10 px-4 text-sm font-medium"
              >
                <Calendar size={16} className="text-text-muted" />
                <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleSave("Confirmed")}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-10 px-5 text-sm font-medium"
              >
                <CheckCircle2 size={16} />
                <span>
                  {isSubmitting
                    ? "Saving..."
                    : initialBill
                      ? "Update Bill"
                      : "Confirm & Save Bill"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
