"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupplierDto } from "@/features/suppliers";
import type { ProductDto } from "@/features/products";
import type { PurchaseSettings } from "@/features/purchase-settings";
import {
  calculatePurchaseOrderTotals,
  calculateExpectedDeliveryDate,
  getTodayDateString,
  validatePurchaseOrderLines,
} from "../../domain/rules/purchase-order-rules";
import { determineTaxMode } from "@/features/invoices";
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from "../../domain/entities/purchase-order";
import { formatSupplierAddress } from "@/features/suppliers";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
} from "../../data/mutations/purchase-order-mutations";
import {
  PurchaseOrderSupplierSection,
  type SampleSupplier,
} from "../components/PurchaseOrderSupplierSection";
import { PurchaseOrderItemsSection } from "../components/PurchaseOrderItemsSection";
import { PurchaseOrderAdditionalChargesAndDiscountSection } from "../components/PurchaseOrderAdditionalChargesAndDiscountSection";
import { PurchaseOrderSummarySection } from "../components/PurchaseOrderSummarySection";
import { PurchaseOrderAdditionalInfoSection } from "../components/PurchaseOrderAdditionalInfoSection";
import { PurchaseOrderDocument } from "../components/PurchaseOrderDocument";
import { PurchaseOrderStatusBadge } from "../components/PurchaseOrderStatusBadge";
import { Button } from "@/shared/components/form";

const initialLine = (id = "line-1"): PurchaseOrderItem => ({
  id,
  item: "",
  description: "",
  hsnSac: "",
  quantity: 1,
  receivedQuantity: 0,
  remainingQuantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 18,
  taxableAmount: 0,
  taxAmount: 0,
  lineTotal: 0,
  sortOrder: 0,
});

export type PurchaseOrderCreatePageProps = {
  initialSuppliers?: SupplierDto[];
  initialProducts?: ProductDto[];
  organizationState?: string;
  organizationGstin?: string;
  organizationName?: string;
  initialOrder?: PurchaseOrder;
  purchaseSettings?: PurchaseSettings;
};

export const PurchaseOrderCreatePage = ({
  initialSuppliers = [],
  initialProducts = [],
  organizationState = "27-Maharashtra",
  organizationName,
  initialOrder,
  purchaseSettings,
}: PurchaseOrderCreatePageProps) => {
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

  const defaultOrderDate = initialOrder?.orderDate || getTodayDateString();
  const deliveryDays = purchaseSettings?.defaultDeliveryDays || 15;
  const defaultDeliveryDate =
    initialOrder?.expectedDeliveryDate ||
    calculateExpectedDeliveryDate(defaultOrderDate, deliveryDays);

  const previewOrderNumber =
    initialOrder?.orderNumber ||
    (purchaseSettings
      ? `${purchaseSettings.purchaseOrderPrefix}${String(purchaseSettings.purchaseOrderNextNumber).padStart(purchaseSettings.purchaseOrderPadding, "0")}${purchaseSettings.purchaseOrderSuffix || ""}`
      : "PO-0001");

  const [order, setOrder] = useState<PurchaseOrder>(() => {
    if (initialOrder) return initialOrder;

    return {
      id: "",
      organizationId: "",
      orderNumber: previewOrderNumber,
      supplierId: "",
      supplierName: "",
      supplierEmail: "",
      supplierAddress: "",
      supplierGstin: "",
      supplierPlaceOfSupply: "",
      orderDate: defaultOrderDate,
      expectedDeliveryDate: defaultDeliveryDate,
      referenceNumber: "",
      status: "Draft",
      taxMode: "CGST_SGST",
      currency: "INR (₹)",
      paymentTerms: purchaseSettings?.defaultPaymentTerms || "",
      notes: purchaseSettings?.defaultPurchaseOrderNotes || "",
      terms: purchaseSettings?.defaultPurchaseOrderTerms || "",
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

  const totals = calculatePurchaseOrderTotals({
    items: order.items,
    taxMode: order.taxMode,
    additionalCharges: order.additionalCharges,
    additionalDiscount: order.additionalDiscount,
    additionalDiscountType: order.additionalDiscountType,
  });

  const update = (patch: Partial<PurchaseOrder>) =>
    setOrder((prev) => ({ ...prev, ...patch }));

  const handleSupplierSelect = (supplier: SampleSupplier | null) => {
    if (!supplier) {
      update({
        supplierId: "",
        supplierName: "",
        supplierEmail: "",
        supplierAddress: "",
        supplierGstin: "",
        supplierPlaceOfSupply: "",
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
      paymentTerms: order.paymentTerms || supplier.paymentTerms || "",
    });
  };

  const handleAddLine = () => {
    setOrder((prev) => ({
      ...prev,
      items: [...prev.items, initialLine(`line-${prev.items.length + 1}`)],
    }));
  };

  const handleUpdateLine = (id: string, patch: Partial<PurchaseOrderItem>) => {
    setOrder((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const handleRemoveLine = (id: string) => {
    setOrder((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleSave = async (submitStatus: PurchaseOrderStatus = "Draft") => {
    setSubmitError(null);
    const newErrors: Record<string, string> = {};

    if (!order.supplierName.trim()) {
      newErrors.supplier = "Please select or enter a supplier.";
    }

    try {
      validatePurchaseOrderLines(order.items);
    } catch (err: unknown) {
      newErrors.items =
        err instanceof Error ? err.message : "Invalid items in purchase order.";
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
        orderNumber: order.orderNumber,
        supplierId: order.supplierId || null,
        supplierName: order.supplierName,
        supplierEmail: order.supplierEmail || null,
        supplierAddress: order.supplierAddress || null,
        supplierGstin: order.supplierGstin || null,
        supplierPlaceOfSupply: order.supplierPlaceOfSupply || null,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate || null,
        referenceNumber: order.referenceNumber || null,
        status: submitStatus,
        taxMode: order.taxMode,
        currency: order.currency,
        paymentTerms: order.paymentTerms || null,
        notes: order.notes || null,
        terms: order.terms || null,
        additionalCharges: order.additionalCharges,
        additionalChargesLabel: order.additionalChargesLabel || null,
        additionalDiscount: order.additionalDiscount,
        additionalDiscountType: order.additionalDiscountType,
        additionalDiscountLabel: order.additionalDiscountLabel || null,
        items: order.items.map((it) => ({
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

      if (initialOrder?.id) {
        const res = await updatePurchaseOrderAction(initialOrder.id, payload);
        if (!res.success) {
          throw new Error(res.error || "Failed to update purchase order.");
        }
        router.push(`/purchase-orders/${initialOrder.id}`);
      } else {
        const res = await createPurchaseOrderAction(payload);
        if (!res.success) {
          throw new Error(res.error || "Failed to create purchase order.");
        }
        if (!res.data) {
          throw new Error("Failed to create purchase order.");
        }
        router.push(`/purchase-orders/${res.data.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save order.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/purchase-orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Purchase Orders
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {initialOrder ? "Edit Purchase Order" : "Create Purchase Order"}
            </h1>
            <PurchaseOrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Capture committed supplier orders with goods-receipt tracking.
            Numbering and defaults come from Purchase Settings.
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
                : initialOrder
                  ? "Update Order"
                  : "Confirm & Save Order"}
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
              Showing live document preview of this purchase order.
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
          <PurchaseOrderDocument order={order} organizationName={organizationName} />
        </div>
      ) : (
        <div className="space-y-6">
          <PurchaseOrderSupplierSection
            selectedSupplier={order.supplierName}
            onSelectSupplier={handleSupplierSelect}
            suppliers={formattedSuppliers}
            orderNumber={order.orderNumber}
            onOrderNumberChange={(val) => update({ orderNumber: val })}
            orderDate={order.orderDate}
            onOrderDateChange={(val) => update({ orderDate: val })}
            expectedDeliveryDate={order.expectedDeliveryDate || ""}
            onExpectedDeliveryDateChange={(val) =>
              update({ expectedDeliveryDate: val })
            }
            referenceNumber={order.referenceNumber || ""}
            onReferenceNumberChange={(val) => update({ referenceNumber: val })}
            paymentTerms={order.paymentTerms || ""}
            onPaymentTermsChange={(val) => update({ paymentTerms: val })}
            errors={errors}
          />

          <PurchaseOrderItemsSection
            items={order.items}
            onUpdateLine={handleUpdateLine}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            availableProducts={initialProducts}
            errors={errors}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] items-stretch">
            <PurchaseOrderAdditionalChargesAndDiscountSection
              additionalCharges={order.additionalCharges}
              onAdditionalChargesChange={(val) =>
                update({ additionalCharges: val })
              }
              additionalChargesLabel={order.additionalChargesLabel || ""}
              onAdditionalChargesLabelChange={(val) =>
                update({ additionalChargesLabel: val })
              }
              additionalDiscount={order.additionalDiscount}
              onAdditionalDiscountChange={(val) =>
                update({ additionalDiscount: val })
              }
              additionalDiscountType={order.additionalDiscountType}
              onAdditionalDiscountTypeChange={(val) =>
                update({ additionalDiscountType: val })
              }
              additionalDiscountLabel={order.additionalDiscountLabel || ""}
              onAdditionalDiscountLabelChange={(val) =>
                update({ additionalDiscountLabel: val })
              }
            />

            <PurchaseOrderSummarySection
              totals={totals}
              taxMode={order.taxMode}
              onTaxModeChange={(mode) => update({ taxMode: mode })}
            />
          </div>

          <PurchaseOrderAdditionalInfoSection
            notes={order.notes || ""}
            onNotesChange={(val) => update({ notes: val })}
            terms={order.terms || ""}
            onTermsChange={(val) => update({ terms: val })}
          />

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
            <Link
              href="/purchase-orders"
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
                    : initialOrder
                      ? "Update Order"
                      : "Confirm & Save Order"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
