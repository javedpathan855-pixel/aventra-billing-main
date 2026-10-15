"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Printer,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { Button, Input, Label, DatePicker } from "@/shared/components/form";
import type { DeliveryChallan } from "../../domain/entities/delivery-challan";
import { DeliveryChallanDocument } from "../components/DeliveryChallanDocument";
import { updateDeliveryChallanStatusAction } from "../../data/mutations/update-delivery-challan-status";
import { deleteDeliveryChallanAction } from "../../data/mutations/delete-delivery-challan";

export type DeliveryChallanDetailPageProps = {
  challan: DeliveryChallan;
  organizationName?: string;
  organizationAddress?: string;
  organizationGstin?: string;
};

export const DeliveryChallanDetailPage = ({
  challan,
  organizationName,
  organizationAddress,
  organizationGstin,
}: DeliveryChallanDetailPageProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeModal, setActiveModal] = useState<"dispatch" | "deliver" | "cancel" | null>(null);
  const [dispatchDate, setDispatchDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [transporter, setTransporter] = useState(challan.transporterName || "");
  const [vehicle, setVehicle] = useState(challan.vehicleNumber || "");
  const [tracking, setTracking] = useState(challan.trackingNumber || "");

  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [recipientName, setRecipientName] = useState(challan.recipientName || "");
  const [recipientPhone, setRecipientPhone] = useState(challan.recipientPhone || "");

  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmDispatch = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateDeliveryChallanStatusAction(challan.id, {
        status: "DISPATCHED",
        dispatchDate,
        transporterName: transporter.trim() || null,
        vehicleNumber: vehicle.trim() || null,
        trackingNumber: tracking.trim() || null,
      });

      if (!result.success) {
        setError(result.error || "Failed to mark challan as dispatched.");
        return;
      }

      setActiveModal(null);
      router.refresh();
    });
  };

  const handleConfirmDeliver = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateDeliveryChallanStatusAction(challan.id, {
        status: "DELIVERED",
        deliveryDate,
        recipientName: recipientName.trim() || null,
        recipientPhone: recipientPhone.trim() || null,
      });

      if (!result.success) {
        setError(result.error || "Failed to mark challan as delivered.");
        return;
      }

      setActiveModal(null);
      router.refresh();
    });
  };

  const handleConfirmCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateDeliveryChallanStatusAction(challan.id, {
        status: "CANCELLED",
      });

      if (!result.success) {
        setError(result.error || "Failed to cancel challan.");
        return;
      }

      setActiveModal(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to permanently delete this draft challan?")) {
      setError(null);
      startTransition(async () => {
        const result = await deleteDeliveryChallanAction(challan.id);
        if (!result.success) {
          setError(result.error || "Failed to delete challan.");
          return;
        }
        router.push("/delivery-challans");
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/delivery-challans"
            className="rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-surface-alt transition-colors"
            title="Back to delivery challans"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                {challan.challanNumber}
              </h1>
              {challan.salesOrderNumber && (
                <span className="text-xs text-text-muted font-mono bg-surface-alt px-2 py-0.5 rounded">
                  SO: {challan.salesOrderNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Consignee: <span className="font-medium text-text-primary">{challan.customerName}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {challan.status === "DRAFT" && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => setActiveModal("dispatch")}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold"
              >
                <Truck size={14} />
                <span>Mark Dispatched</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal("cancel")}
                disabled={isPending}
                className="h-9 px-3 text-xs font-medium text-danger hover:text-danger"
              >
                <XCircle size={14} />
                <span>Cancel</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                disabled={isPending}
                className="h-9 px-3 text-xs font-medium text-danger hover:text-danger"
                title="Delete draft challan"
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}

          {challan.status === "DISPATCHED" && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => setActiveModal("deliver")}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold"
              >
                <CheckCircle size={14} />
                <span>Mark Delivered</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal("cancel")}
                disabled={isPending}
                className="h-9 px-3 text-xs font-medium text-danger hover:text-danger"
              >
                <XCircle size={14} />
                <span>Cancel Dispatch</span>
              </Button>
            </>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={handlePrint}
            className="h-9 px-3.5 text-xs font-medium"
            title="Print or save as PDF"
          >
            <Printer size={14} />
            <span>Print Challan</span>
          </Button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div
          className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger flex items-center justify-between"
          role="alert"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => setError(null)}
            className="h-auto p-1 text-danger hover:text-danger/80"
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* Main Document View */}
      <DeliveryChallanDocument
        challan={challan}
        organizationName={organizationName}
        organizationAddress={organizationAddress}
        organizationGstin={organizationGstin}
      />

      {/* Dispatch Modal / Panel */}
      {activeModal === "dispatch" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-primary-light" />
                <h3 className="text-base font-semibold text-text-primary">
                  Dispatch Delivery Challan
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setActiveModal(null)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="mDispatchDate">Dispatch Date *</Label>
                <div className="mt-1">
                  <DatePicker
                    id="mDispatchDate"
                    value={dispatchDate}
                    onChange={setDispatchDate}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="mTransporter">Transporter Name</Label>
                <Input
                  id="mTransporter"
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  placeholder="e.g. VRL Logistics"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="mVehicle">Vehicle Number</Label>
                <Input
                  id="mVehicle"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g. MH-31-EQ-1234"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="mTracking">Docket / Tracking Number</Label>
                <Input
                  id="mTracking"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="e.g. TRK-981240"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal(null)}
                disabled={isPending}
                className="h-9 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmDispatch}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : "Confirm Dispatch"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deliver Modal / Panel */}
      {activeModal === "deliver" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-success" />
                <h3 className="text-base font-semibold text-text-primary">
                  Confirm Goods Delivered
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setActiveModal(null)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="mDeliveryDate">Actual Delivery Date *</Label>
                <div className="mt-1">
                  <DatePicker
                    id="mDeliveryDate"
                    value={deliveryDate}
                    onChange={setDeliveryDate}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="mRecipientName">Recipient Name / Receiver</Label>
                <Input
                  id="mRecipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="mRecipientPhone">Recipient Contact Phone</Label>
                <Input
                  id="mRecipientPhone"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal(null)}
                disabled={isPending}
                className="h-9 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmDeliver}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : "Confirm Delivery"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal / Panel */}
      {activeModal === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-danger" />
                <h3 className="text-base font-semibold text-text-primary">
                  Cancel Delivery Challan
                </h3>
              </div>
              <Button
                type="button"
                variant="link"
                onClick={() => setActiveModal(null)}
                className="h-auto p-1 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </Button>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Are you sure you want to cancel this delivery challan? Cancelled challans are excluded from active delivered quantities and will restore the deliverable balance on the related Sales Order.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveModal(null)}
                disabled={isPending}
                className="h-9 px-3 text-xs"
              >
                No, Keep Active
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmCancel}
                disabled={isPending}
                className="h-9 px-4 text-xs font-semibold bg-danger hover:bg-danger/90 text-white"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : "Yes, Cancel Challan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
