"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerDto } from "@/features/customers";
import type { ProductDto } from "@/features/products";
import type { SalesSettings } from "@/features/sales-settings";
import type { Estimate } from "@/features/estimates";
import {
  calculateSalesOrderTotals,
  calculateExpectedDeliveryDate,
  getTodayDateString,
  validateSalesOrderLines,
} from "../../domain/rules/sales-order-rules";
import { determineTaxMode } from "@/features/invoices";
import type {
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
} from "../../domain/entities/sales-order";
import { formatCustomerAddress } from "@/features/customers";
import {
  createSalesOrderAction,
  updateSalesOrderAction,
} from "../../data/mutations/sales-order-mutations";
import {
  SalesOrderCustomerSection,
  type SampleCustomer,
} from "../components/SalesOrderCustomerSection";
import { SalesOrderItemsSection } from "../components/SalesOrderItemsSection";
import { SalesOrderAdditionalChargesAndDiscountSection } from "../components/SalesOrderAdditionalChargesAndDiscountSection";
import { SalesOrderSummarySection } from "../components/SalesOrderSummarySection";
import { SalesOrderAdditionalInfoSection } from "../components/SalesOrderAdditionalInfoSection";
import { SalesOrderDocument } from "../components/SalesOrderDocument";
import { SalesOrderStatusBadge } from "../components/SalesOrderStatusBadge";
import { Button } from "@/shared/components/form";

const initialLine = (id = "line-1"): SalesOrderItem => ({
  id,
  item: "",
  description: "",
  hsnSac: "",
  quantity: 1,
  fulfilledQuantity: 0,
  remainingQuantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 18,
  taxableAmount: 0,
  taxAmount: 0,
  lineTotal: 0,
  sortOrder: 0,
});

export type SalesOrderCreatePageProps = {
  initialCustomers?: CustomerDto[];
  initialProducts?: ProductDto[];
  supplierState?: string;
  supplierGstin?: string;
  supplierName?: string;
  initialOrderNumber?: string;
  initialOrder?: SalesOrder;
  fromEstimate?: Estimate;
  salesSettings?: SalesSettings;
};

export const SalesOrderCreatePage = ({
  initialCustomers = [],
  initialProducts = [],
  supplierState = "27-Maharashtra",
  supplierName,
  initialOrderNumber,
  initialOrder,
  fromEstimate,
  salesSettings,
}: SalesOrderCreatePageProps) => {
  const router = useRouter();

  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formattedCustomers: SampleCustomer[] = useMemo(() => {
    return initialCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email || "",
      address: formatCustomerAddress(c.billingAddress),
      gstin: c.gstin || "",
      phone: c.phone || undefined,
      contactPerson: c.contactPerson || undefined,
      pan: c.pan || undefined,
      state: c.placeOfSupply || c.billingAddress.state,
      placeOfSupply: c.placeOfSupply || c.billingAddress.state || "",
      gstTreatment: c.gstTreatment,
      paymentTerms: c.paymentTerms || undefined,
    }));
  }, [initialCustomers]);

  const defaultOrderDate = initialOrder?.orderDate || getTodayDateString();
  const deliveryDays = salesSettings?.defaultDeliveryDays || 15;
  const defaultDeliveryDate =
    initialOrder?.expectedDeliveryDate ||
    calculateExpectedDeliveryDate(defaultOrderDate, deliveryDays);

  const previewOrderNumber =
    initialOrderNumber ||
    (salesSettings
      ? `${salesSettings.salesOrderPrefix}${String(salesSettings.salesOrderNextNumber).padStart(salesSettings.salesOrderPadding, "0")}${salesSettings.salesOrderSuffix || ""}`
      : "SO-0001");

  const [order, setOrder] = useState<SalesOrder>(() => {
    if (initialOrder) return initialOrder;
    if (fromEstimate) {
      const items: SalesOrderItem[] = fromEstimate.items.map((it, idx) => ({
        id: `line-${idx + 1}`,
        item: it.item,
        description: it.description || "",
        hsnSac: it.hsnSac || "",
        quantity: it.quantity,
        fulfilledQuantity: 0,
        remainingQuantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount || 0,
        taxRate: it.taxRate || 18,
        taxableAmount: 0,
        taxAmount: 0,
        lineTotal: 0,
        sortOrder: idx,
      }));

      const taxMode = fromEstimate.taxMode;
      const additionalCharges = fromEstimate.additionalCharges || 0;
      const additionalDiscount = fromEstimate.additionalDiscount || 0;
      const additionalDiscountType = fromEstimate.additionalDiscountType || "fixed";

      const totals = calculateSalesOrderTotals({
        items,
        taxMode,
        additionalCharges,
        additionalDiscount,
        additionalDiscountType,
      });

      return {
        id: "",
        organizationId: "",
        orderNumber: previewOrderNumber,
        customerId: fromEstimate.customerId || null,
        customerName: fromEstimate.customer,
        customerEmail: fromEstimate.customerEmail || "",
        customerAddress: fromEstimate.customerAddress || "",
        customerGstin: fromEstimate.customerGstin || "",
        customerPlaceOfSupply: fromEstimate.customerPlaceOfSupply || "",
        orderDate: defaultOrderDate,
        expectedDeliveryDate: defaultDeliveryDate,
        referenceNumber: fromEstimate.referenceNumber || "",
        status: "Draft",
        taxMode,
        currency: "INR (₹)",
        notes: salesSettings?.defaultSalesOrderNotes || fromEstimate.notes || "",
        terms: salesSettings?.defaultSalesOrderTerms || fromEstimate.terms || "",
        additionalCharges,
        additionalChargesLabel: fromEstimate.additionalChargesLabel || "",
        additionalDiscount,
        additionalDiscountType,
        additionalDiscountLabel: fromEstimate.additionalDiscountLabel || "",
        sourceEstimateId: fromEstimate.id,
        sourceEstimateNumber: fromEstimate.estimateNumber,
        subtotal: totals.subtotal,
        lineDiscountTotal: totals.lineDiscountTotal,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalTax: totals.totalTax,
        total: totals.total,
        createdAt: new Date(),
        updatedAt: new Date(),
        items,
      };
    }

    return {
      id: "",
      organizationId: "",
      orderNumber: previewOrderNumber,
      customerId: "",
      customerName: "",
      customerEmail: "",
      customerAddress: "",
      customerGstin: "",
      customerPlaceOfSupply: "",
      orderDate: defaultOrderDate,
      expectedDeliveryDate: defaultDeliveryDate,
      referenceNumber: "",
      status: "Draft",
      taxMode: "CGST_SGST",
      currency: "INR (₹)",
      notes: salesSettings?.defaultSalesOrderNotes || "",
      terms: salesSettings?.defaultSalesOrderTerms || "",
      additionalCharges: 0,
      additionalChargesLabel: "",
      additionalDiscount: 0,
      additionalDiscountType: "fixed",
      additionalDiscountLabel: "",
      sourceEstimateId: null,
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

  const totals = calculateSalesOrderTotals({
    items: order.items,
    taxMode: order.taxMode,
    additionalCharges: order.additionalCharges,
    additionalDiscount: order.additionalDiscount,
    additionalDiscountType: order.additionalDiscountType,
  });

  const update = (patch: Partial<SalesOrder>) =>
    setOrder((prev) => ({ ...prev, ...patch }));

  const handleCustomerSelect = (customer: SampleCustomer | null) => {
    if (!customer) {
      update({
        customerId: "",
        customerName: "",
        customerEmail: "",
        customerAddress: "",
        customerGstin: "",
        customerPlaceOfSupply: "",
      });
      return;
    }

    const customerPlace = customer.placeOfSupply || customer.state || "";
    const taxDecision = determineTaxMode({
      supplierState,
      customerPlaceOfSupply: customerPlace,
    });
    const derivedTaxMode = taxDecision.taxMode;

    update({
      customerId: customer.id || null,
      customerName: customer.name,
      customerEmail: customer.email || "",
      customerAddress: customer.address || "",
      customerGstin: customer.gstin || "",
      customerPlaceOfSupply: customerPlace,
      taxMode: derivedTaxMode,
    });
  };

  const handleAddLine = () => {
    setOrder((prev) => ({
      ...prev,
      items: [...prev.items, initialLine(`line-${prev.items.length + 1}`)],
    }));
  };

  const handleUpdateLine = (id: string, patch: Partial<SalesOrderItem>) => {
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

  const handleSave = async (submitStatus: SalesOrderStatus = "Draft") => {
    setSubmitError(null);
    const newErrors: Record<string, string> = {};

    if (!order.customerName.trim()) {
      newErrors.customer = "Please select or enter a customer.";
    }

    try {
      validateSalesOrderLines(order.items);
    } catch (err: unknown) {
      newErrors.items =
        err instanceof Error ? err.message : "Invalid items in sales order.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      setSubmitError(newErrors[firstKey]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        orderNumber: order.orderNumber,
        customerId: order.customerId || null,
        customerName: order.customerName,
        customerEmail: order.customerEmail || null,
        customerAddress: order.customerAddress || null,
        customerGstin: order.customerGstin || null,
        customerPlaceOfSupply: order.customerPlaceOfSupply || null,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate || null,
        referenceNumber: order.referenceNumber || null,
        status: submitStatus,
        taxMode: order.taxMode,
        currency: order.currency,
        notes: order.notes || null,
        terms: order.terms || null,
        additionalCharges: order.additionalCharges,
        additionalChargesLabel: order.additionalChargesLabel || null,
        additionalDiscount: order.additionalDiscount,
        additionalDiscountType: order.additionalDiscountType,
        additionalDiscountLabel: order.additionalDiscountLabel || null,
        sourceEstimateId: order.sourceEstimateId || null,
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
        const res = await updateSalesOrderAction(initialOrder.id, payload);
        if (!res.success) {
          throw new Error(res.error || "Failed to update sales order.");
        }
        router.push(`/sales-orders/${initialOrder.id}`);
      } else {
        const res = await createSalesOrderAction(payload);
        if (!res.success) {
          throw new Error(res.error || "Failed to create sales order.");
        }
        if (!res.data) {
          throw new Error("Failed to create sales order.");
        }
        router.push(`/sales-orders/${res.data.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save order.";
      setSubmitError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* 1. Back Navigation Link */}
      <div>
        <Link
          href="/sales-orders"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Sales Orders
        </Link>
      </div>

      {/* 2. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {initialOrder
                ? "Edit Sales Order"
                : fromEstimate
                ? "Create Order from Quotation"
                : "Create Sales Order"}
            </h1>
            <SalesOrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {fromEstimate
              ? `Creating confirmed sales order from quotation ${fromEstimate.estimateNumber}.`
              : "Capture committed customer orders with inventory tracking and invoicing integration."}
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

      {/* 3. Global Submit / Server Error Alert */}
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

      {/* 4. Live Full-Document Preview Toggle */}
      {preview ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-4">
            <span className="text-sm font-medium text-text-primary">
              Showing live document preview of this sales order.
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
          <SalesOrderDocument order={order} supplierName={supplierName} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Customer & Parameters Section */}
          <SalesOrderCustomerSection
            selectedCustomer={order.customerName}
            onSelectCustomer={handleCustomerSelect}
            customers={formattedCustomers}
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
            errors={errors}
          />

          {/* Line Items Section */}
          <SalesOrderItemsSection
            items={order.items}
            onUpdateLine={handleUpdateLine}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            availableProducts={initialProducts}
            errors={errors}
          />

          {/* Side-by-Side: Additional Charges/Discount & Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
            <SalesOrderAdditionalChargesAndDiscountSection
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

            <SalesOrderSummarySection
              totals={totals}
              taxMode={order.taxMode}
              onTaxModeChange={(mode) => update({ taxMode: mode })}
              items={order.items}
            />
          </div>

          {/* Additional Notes & Terms */}
          <SalesOrderAdditionalInfoSection
            notes={order.notes || ""}
            onNotesChange={(val) => update({ notes: val })}
            terms={order.terms || ""}
            onTermsChange={(val) => update({ terms: val })}
          />

          {/* Bottom Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
            <Link
              href="/sales-orders"
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
