"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/form";
import type {
  DeliverableSalesOrder,
  DeliveryChallan,
} from "../../domain/entities/delivery-challan";
import { createDeliveryChallanAction } from "../../data/mutations/create-delivery-challan";
import { DeliveryChallanStatusBadge } from "../components/DeliveryChallanStatusBadge";
import { DeliveryChallanDocument } from "../components/DeliveryChallanDocument";
import { DeliveryChallanCustomerSection } from "../components/DeliveryChallanCustomerSection";
import {
  DeliveryChallanItemsSection,
  type ChallanLineState,
} from "../components/DeliveryChallanItemsSection";
import { DeliveryChallanTransportSection } from "../components/DeliveryChallanTransportSection";
import { DeliveryChallanSummarySection } from "../components/DeliveryChallanSummarySection";
import { DeliveryChallanAdditionalInfoSection } from "../components/DeliveryChallanAdditionalInfoSection";

export type DeliveryChallanCreatePageProps = {
  deliverableOrders: DeliverableSalesOrder[];
  defaultNumberPreview: string;
  defaultInstructions?: string | null;
  defaultTerms?: string | null;
};

export const DeliveryChallanCreatePage = ({
  deliverableOrders,
  defaultNumberPreview,
  defaultInstructions,
  defaultTerms,
}: DeliveryChallanCreatePageProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [preview, setPreview] = useState(false);

  // Document Info
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [challanDate, setChallanDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [dispatchDate, setDispatchDate] = useState<string>("");

  // Transport Details
  const [transporterName, setTransporterName] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [transportMode, setTransportMode] = useState<string>("Road");
  const [deliveryReason, setDeliveryReason] = useState<string>("Supply against Sales Order");

  // Instructions & Terms
  const [notes, setNotes] = useState<string>(defaultInstructions || "");
  const [terms, setTerms] = useState<string>(defaultTerms || "");

  // Line Items
  const [items, setItems] = useState<ChallanLineState[]>([]);

  // Errors & Feedback
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    setFormError(null);
    setFieldErrors({});

    if (!orderId) {
      return;
    }

    const order = deliverableOrders.find((o) => o.id === orderId);
    if (!order) return;

    setCustomerName(order.customerName);
    setCustomerEmail(order.customerEmail || "");
    setCustomerAddress(order.customerAddress || "");
    setCustomerGstin(order.customerGstin || "");
    setDeliveryAddress(order.customerAddress || "");

    const newItems: ChallanLineState[] = order.items
      .filter((it) => it.remainingDeliverableQuantity > 0)
      .map((it) => ({
        salesOrderItemId: it.id,
        productId: it.productId,
        item: it.item,
        description: it.description || "",
        hsnSac: it.hsnSac || "",
        unit: it.unit,
        orderedQuantity: it.orderedQuantity,
        previouslyDeliveredQuantity: it.previouslyDeliveredQuantity,
        remainingDeliverableQuantity: it.remainingDeliverableQuantity,
        deliveredQuantity: String(it.remainingDeliverableQuantity),
      }));

    setItems(newItems);
  };

  const handleUpdateLine = <K extends keyof ChallanLineState>(
    index: number,
    field: K,
    value: ChallanLineState[K],
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddManualItem = () => {
    setItems((prev) => [
      ...prev,
      {
        salesOrderItemId: null,
        productId: null,
        item: "",
        description: "",
        hsnSac: "",
        unit: "PCS",
        orderedQuantity: 1,
        previouslyDeliveredQuantity: 0,
        remainingDeliverableQuantity: 999999,
        deliveredQuantity: "1",
      },
    ]);
  };

  // Ephemeral DeliveryChallan model for live document preview
  const previewChallan: DeliveryChallan = {
    id: "preview-id",
    organizationId: "org-preview",
    challanNumber: defaultNumberPreview,
    customerId:
      deliverableOrders.find((o) => o.id === selectedOrderId)?.customerId ||
      null,
    customerName: customerName || "Customer Name",
    customerEmail: customerEmail || null,
    customerAddress: customerAddress || null,
    customerGstin: customerGstin || null,
    salesOrderId: selectedOrderId || null,
    salesOrderNumber:
      deliverableOrders.find((o) => o.id === selectedOrderId)?.orderNumber ||
      null,
    invoiceId: null,
    invoiceNumber: null,
    challanDate: new Date(challanDate),
    dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
    deliveryDate: null,
    status: "DRAFT",
    deliveryAddress: deliveryAddress || null,
    transporterName: transporterName || null,
    vehicleNumber: vehicleNumber || null,
    trackingNumber: trackingNumber || null,
    transportMode: transportMode || null,
    deliveryReason,
    recipientName: null,
    recipientPhone: null,
    notes: notes || null,
    terms: terms || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: items.map((it, idx) => ({
      id: `preview-item-${idx}`,
      challanId: "preview-id",
      salesOrderItemId: it.salesOrderItemId,
      productId: it.productId,
      item: it.item || "Unnamed Item",
      description: it.description || null,
      hsnSac: it.hsnSac || null,
      unit: it.unit,
      orderedQuantity: it.orderedQuantity,
      deliveredQuantity: parseFloat(it.deliveredQuantity) || 0,
      sortOrder: idx,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };

  const handleSave = () => {
    setFormError(null);
    setFieldErrors({});

    if (!customerName.trim()) {
      setFormError("Customer name is required.");
      setFieldErrors({ customerName: "Customer name is required." });
      return;
    }

    if (!challanDate.trim()) {
      setFormError("Challan date is required.");
      setFieldErrors({ challanDate: "Challan date is required." });
      return;
    }

    if (items.length === 0) {
      setFormError("At least one deliverable item must be added to the delivery challan.");
      setFieldErrors({ items: "At least one deliverable item is required." });
      return;
    }

    // Validate quantities
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const qtyNum = parseFloat(it.deliveredQuantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setFormError(`Line ${i + 1} must have a delivered quantity greater than 0.`);
        setFieldErrors({
          [`items.${i}.deliveredQuantity`]: "Quantity must be greater than 0.",
        });
        return;
      }
      if (it.salesOrderItemId && qtyNum > it.remainingDeliverableQuantity + 0.0001) {
        setFormError(
          `Line ${i + 1} (${it.item}): Delivered quantity (${qtyNum}) cannot exceed remaining deliverable quantity (${it.remainingDeliverableQuantity}).`,
        );
        setFieldErrors({
          [`items.${i}.deliveredQuantity`]: `Cannot exceed remaining deliverable quantity (${it.remainingDeliverableQuantity}).`,
        });
        return;
      }
      if (!it.item.trim()) {
        setFormError(`Line ${i + 1} must have an item name.`);
        setFieldErrors({ [`items.${i}.item`]: "Item name is required." });
        return;
      }
    }

    startTransition(async () => {
      const result = await createDeliveryChallanAction({
        customerId: deliverableOrders.find((o) => o.id === selectedOrderId)?.customerId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        customerAddress: customerAddress.trim() || null,
        customerGstin: customerGstin.trim() || null,
        salesOrderId: selectedOrderId || null,
        challanDate,
        dispatchDate: dispatchDate || null,
        deliveryAddress: deliveryAddress.trim() || null,
        transporterName: transporterName.trim() || null,
        vehicleNumber: vehicleNumber.trim() || null,
        trackingNumber: trackingNumber.trim() || null,
        transportMode: transportMode.trim() || null,
        deliveryReason: deliveryReason.trim() || "Supply against Sales Order",
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        items: items.map((it, idx) => ({
          salesOrderItemId: it.salesOrderItemId,
          productId: it.productId,
          item: it.item.trim(),
          description: it.description.trim() || null,
          hsnSac: it.hsnSac.trim() || null,
          unit: it.unit.trim() || "PCS",
          orderedQuantity: it.orderedQuantity,
          deliveredQuantity: parseFloat(it.deliveredQuantity),
          sortOrder: idx,
        })),
      });

      if (!result.success) {
        setFormError(result.error || "Failed to create delivery challan.");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      if (result.data) {
        router.push(`/delivery-challans/${result.data.id}`);
      }
    });
  };

  return (
    <section className="space-y-6">
      {/* 1. Back Navigation Link */}
      <div>
        <Link
          href="/delivery-challans"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Delivery Challans
        </Link>
      </div>

      {/* 2. Page Header & Actions matching SalesOrderCreatePage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              New Delivery Challan
            </h1>
            <DeliveryChallanStatusBadge status="DRAFT" />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Draft a dispatch delivery document with item-level quantities and transport details.
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
            variant="primary"
            onClick={handleSave}
            disabled={isPending}
            className="h-10 px-4 text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            <span>{isPending ? "Saving..." : "Save & Generate Challan"}</span>
          </Button>
        </div>
      </div>

      {/* 3. Global Submit / Server Error Alert */}
      {formError && (
        <div
          className="flex items-center justify-between rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
          role="alert"
        >
          <span>{formError}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => setFormError(null)}
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
              Showing live document preview of this delivery challan.
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
          <DeliveryChallanDocument challan={previewChallan} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Dispatch & Customer Details */}
          <DeliveryChallanCustomerSection
            deliverableOrders={deliverableOrders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleOrderSelect}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerEmail={customerEmail}
            onCustomerEmailChange={setCustomerEmail}
            challanNumberPreview={defaultNumberPreview}
            challanDate={challanDate}
            onChallanDateChange={setChallanDate}
            dispatchDate={dispatchDate}
            onDispatchDateChange={setDispatchDate}
            deliveryReason={deliveryReason}
            onDeliveryReasonChange={setDeliveryReason}
            customerAddress={customerAddress}
            onCustomerAddressChange={setCustomerAddress}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
            fieldErrors={fieldErrors}
          />

          {/* Section 2: Delivery Line Items */}
          <DeliveryChallanItemsSection
            items={items}
            onUpdateLine={handleUpdateLine}
            onAddLine={handleAddManualItem}
            onRemoveLine={handleRemoveItem}
            fieldErrors={fieldErrors}
          />

          {/* Section 3: Side-by-Side Transport & Dispatch Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
            <DeliveryChallanTransportSection
              transporterName={transporterName}
              onTransporterNameChange={setTransporterName}
              vehicleNumber={vehicleNumber}
              onVehicleNumberChange={setVehicleNumber}
              trackingNumber={trackingNumber}
              onTrackingNumberChange={setTrackingNumber}
              transportMode={transportMode}
              onTransportModeChange={setTransportMode}
            />

            <DeliveryChallanSummarySection
              items={items}
              challanNumberPreview={defaultNumberPreview}
            />
          </div>

          {/* Section 4: Notes & Terms */}
          <DeliveryChallanAdditionalInfoSection
            notes={notes}
            onNotesChange={setNotes}
            terms={terms}
            onTermsChange={setTerms}
          />

          {/* Section 5: Bottom Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
            <Link
              href="/delivery-challans"
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
            >
              <X size={15} />
              <span>Cancel</span>
            </Link>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={handleSave}
                disabled={isPending}
                className="w-full sm:w-auto h-10 px-5 text-sm font-medium"
              >
                <CheckCircle2 size={16} />
                <span>{isPending ? "Saving..." : "Save & Generate Challan"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
