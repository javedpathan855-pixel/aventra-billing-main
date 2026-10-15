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
  calculatePurchaseReturnTotals,
  getTodayDateString,
} from "../../domain/rules/purchase-return-rules";
import { determineTaxMode } from "@/features/invoices";
import type {
  PurchaseReturn,
  PurchaseReturnItem,
  ReturnableBill,
  ReturnDisposition,
} from "../../domain/entities/purchase-return";
import { formatSupplierAddress } from "@/features/suppliers";
import {
  createPurchaseReturnAction,
  updatePurchaseReturnStatusAction,
} from "../../data/mutations/purchase-return-mutations";
import {
  PurchaseReturnSupplierSection,
  type SampleSupplier,
} from "../components/PurchaseReturnSupplierSection";
import { PurchaseReturnItemsSection } from "../components/PurchaseReturnItemsSection";
import { PurchaseReturnSummarySection } from "../components/PurchaseReturnSummarySection";
import { PurchaseReturnAdditionalInfoSection } from "../components/PurchaseReturnAdditionalInfoSection";
import { PurchaseReturnDocument } from "../components/PurchaseReturnDocument";
import { PurchaseReturnStatusBadge } from "../components/PurchaseReturnStatusBadge";
import { Button } from "@/shared/components/form";

const initialLine = (id = "line-1"): PurchaseReturnItem => ({
  id,
  purchaseReturnId: "",
  productId: null,
  purchaseBillItemId: null,
  item: "",
  description: "",
  hsnSac: "",
  billedQuantity: 0,
  returnQuantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 18,
  taxAmount: 0,
  lineTotal: 0,
  disposition: "RESTOCK",
  reason: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const lineFromReturnableBill = (
  it: ReturnableBill["items"][number],
  idx: number,
): PurchaseReturnItem => ({
  id: `line-${idx + 1}`,
  purchaseReturnId: "",
  productId: it.productId || null,
  purchaseBillItemId: it.id,
  item: it.item,
  description: it.description || "",
  hsnSac: it.hsnSac || "",
  billedQuantity: it.billedQuantity,
  returnQuantity: it.remainingReturnableQuantity,
  unitPrice: it.unitPrice,
  discount: it.discount || 0,
  taxRate: it.taxRate ?? 18,
  taxAmount: 0,
  lineTotal: 0,
  disposition: "RESTOCK",
  reason: null,
  sortOrder: idx,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const splitTax = (taxAmount: number, taxMode: "CGST_SGST" | "IGST") => {
  if (taxMode === "IGST") {
    return { cgst: 0, sgst: 0, igst: Math.round(taxAmount * 100) / 100 };
  }
  const cgst = Math.round(((taxAmount + Number.EPSILON) / 2) * 100) / 100;
  return {
    cgst,
    sgst: Math.round((taxAmount - cgst + Number.EPSILON) * 100) / 100,
    igst: 0,
  };
};

export type PurchaseReturnCreatePageProps = {
  initialSuppliers?: SupplierDto[];
  initialProducts?: ProductDto[];
  initialReturnableBills?: ReturnableBill[];
  initialPurchaseOrders?: PurchaseOrder[];
  organizationState?: string;
  organizationName?: string;
  purchaseSettings?: PurchaseSettings;
};

export const PurchaseReturnCreatePage = ({
  initialSuppliers = [],
  initialProducts = [],
  initialReturnableBills = [],
  initialPurchaseOrders = [],
  organizationState = "27-Maharashtra",
  organizationName,
  purchaseSettings,
}: PurchaseReturnCreatePageProps) => {
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

  const defaultReturnDate = getTodayDateString();

  const previewReturnNumber = purchaseSettings
    ? `${purchaseSettings.purchaseReturnPrefix}${String(purchaseSettings.purchaseReturnNextNumber).padStart(purchaseSettings.purchaseReturnPadding, "0")}${purchaseSettings.purchaseReturnSuffix || ""}`
    : "PR-0001";

  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn>(() => ({
    id: "",
    organizationId: "",
    returnNumber: previewReturnNumber,
    supplierId: "",
    supplierName: "",
    supplierEmail: "",
    supplierAddress: "",
    supplierGstin: "",
    supplierPlaceOfSupply: "",
    purchaseBillId: "",
    purchaseBillNumber: "",
    purchaseOrderId: "",
    purchaseOrderNumber: "",
    returnDate: defaultReturnDate,
    reason: purchaseSettings?.defaultPurchaseReturnReason || "",
    status: "DRAFT",
    taxMode: "CGST_SGST",
    currency: "INR (₹)",
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    notes: purchaseSettings?.defaultPurchaseReturnNotes || "",
    terms: purchaseSettings?.defaultPurchaseReturnTerms || "",
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [initialLine("line-1")],
  }));

  const totals = calculatePurchaseReturnTotals(
    purchaseReturn.items.map((it) => ({
      returnQuantity: it.returnQuantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    })),
  );
  const taxSplit = splitTax(totals.taxAmount, purchaseReturn.taxMode);

  const remainingByBillItemId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const bill of initialReturnableBills) {
      for (const it of bill.items) {
        map[it.id] = it.remainingReturnableQuantity;
      }
    }
    return map;
  }, [initialReturnableBills]);

  const update = (patch: Partial<PurchaseReturn>) =>
    setPurchaseReturn((prev) => ({ ...prev, ...patch }));

  const handleSupplierSelect = (supplier: SampleSupplier | null) => {
    if (!supplier) {
      update({
        supplierId: "",
        supplierName: "",
        supplierEmail: "",
        supplierAddress: "",
        supplierGstin: "",
        supplierPlaceOfSupply: "",
        purchaseBillId: "",
        purchaseBillNumber: "",
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

    update({
      supplierId: supplier.id || null,
      supplierName: supplier.name,
      supplierEmail: supplier.email || "",
      supplierAddress: supplier.address || "",
      supplierGstin: supplier.gstin || "",
      supplierPlaceOfSupply: supplierPlace,
      taxMode: taxDecision.taxMode,
      purchaseBillId: "",
      purchaseBillNumber: "",
      purchaseOrderId: "",
      purchaseOrderNumber: "",
    });
  };

  const handleBillSelect = (bill: ReturnableBill | null) => {
    if (!bill) {
      update({ purchaseBillId: "", purchaseBillNumber: "" });
      return;
    }

    update({
      purchaseBillId: bill.id,
      purchaseBillNumber: bill.billNumber,
      supplierId: bill.supplierId || purchaseReturn.supplierId,
      supplierName: bill.supplierName || purchaseReturn.supplierName,
      supplierEmail: bill.supplierEmail || purchaseReturn.supplierEmail,
      supplierAddress: bill.supplierAddress || purchaseReturn.supplierAddress,
      supplierGstin: bill.supplierGstin || purchaseReturn.supplierGstin,
      supplierPlaceOfSupply:
        bill.supplierPlaceOfSupply || purchaseReturn.supplierPlaceOfSupply,
      taxMode: bill.taxMode || purchaseReturn.taxMode,
      currency: bill.currency || purchaseReturn.currency,
      items: bill.items.map(lineFromReturnableBill),
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
    });
  };

  const handleAddLine = () => {
    setPurchaseReturn((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...initialLine(`line-${prev.items.length + 1}`), sortOrder: prev.items.length },
      ],
    }));
  };

  const handleUpdateLine = (id: string, patch: Partial<PurchaseReturnItem>) => {
    setPurchaseReturn((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const handleRemoveLine = (id: string) => {
    setPurchaseReturn((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }));
  };

  const handleSave = async (approve: boolean) => {
    setSubmitError(null);
    const newErrors: Record<string, string> = {};

    if (!purchaseReturn.supplierName.trim()) {
      newErrors.supplier = "Please select or enter a supplier.";
    }
    if (!purchaseReturn.reason.trim()) {
      newErrors.reason = "A reason for the return is required.";
    }
    if (purchaseReturn.items.length === 0) {
      newErrors.items = "A purchase return must contain at least one line item.";
    } else {
      for (const [index, it] of purchaseReturn.items.entries()) {
        if (!it.item.trim()) {
          newErrors[`items.${index}.item`] = "Item name is required.";
        }
        if (!(it.returnQuantity > 0)) {
          newErrors[`items.${index}.returnQuantity`] =
            "Return quantity must be greater than zero.";
        }
      }
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
        returnNumber: purchaseReturn.returnNumber,
        supplierId: purchaseReturn.supplierId || null,
        supplierName: purchaseReturn.supplierName,
        supplierEmail: purchaseReturn.supplierEmail || null,
        supplierAddress: purchaseReturn.supplierAddress || null,
        supplierGstin: purchaseReturn.supplierGstin || null,
        supplierPlaceOfSupply: purchaseReturn.supplierPlaceOfSupply || null,
        purchaseBillId: purchaseReturn.purchaseBillId || null,
        purchaseOrderId: purchaseReturn.purchaseOrderId || null,
        returnDate: purchaseReturn.returnDate,
        reason: purchaseReturn.reason,
        taxMode: purchaseReturn.taxMode,
        currency: purchaseReturn.currency,
        notes: purchaseReturn.notes || null,
        terms: purchaseReturn.terms || null,
        items: purchaseReturn.items.map((it, idx) => ({
          productId: it.productId || null,
          purchaseBillItemId: it.purchaseBillItemId || null,
          item: it.item,
          description: it.description || null,
          hsnSac: it.hsnSac || null,
          billedQuantity: it.billedQuantity,
          returnQuantity: it.returnQuantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
          disposition: it.disposition as ReturnDisposition,
          reason: it.reason || null,
          sortOrder: idx,
        })),
      };

      const res = await createPurchaseReturnAction(payload);
      if (!res.success || !res.data) {
        if (res.fieldErrors) {
          setErrors(res.fieldErrors);
        }
        throw new Error(res.error || "Failed to create purchase return.");
      }

      if (approve) {
        const approved = await updatePurchaseReturnStatusAction(res.data.id, {
          status: "APPROVED",
        });
        if (!approved.success) {
          router.push(`/purchase-returns/${res.data.id}`);
          throw new Error(
            approved.error || "Return created but approval failed.",
          );
        }
      }

      router.push(`/purchase-returns/${res.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save return.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewReturn: PurchaseReturn = {
    ...purchaseReturn,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
  };

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/purchase-returns"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Purchase Returns
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Create Purchase Return
            </h1>
            <PurchaseReturnStatusBadge status={purchaseReturn.status} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Send goods back to the supplier against a posted bill. Return
            quantities cannot exceed what is left to return.
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
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className="h-10 px-4 text-sm font-medium"
          >
            <Calendar size={16} className="text-text-muted" />
            <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="h-10 px-4 text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? "Saving..." : "Approve & Save Return"}</span>
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
              Showing live document preview of this purchase return.
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
          <PurchaseReturnDocument
            purchaseReturn={previewReturn}
            organizationName={organizationName}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <PurchaseReturnSupplierSection
            selectedSupplier={purchaseReturn.supplierName}
            onSelectSupplier={handleSupplierSelect}
            suppliers={formattedSuppliers}
            returnNumber={purchaseReturn.returnNumber}
            onReturnNumberChange={(val) => update({ returnNumber: val })}
            returnableBills={initialReturnableBills}
            selectedBillId={purchaseReturn.purchaseBillId || ""}
            onSelectBill={handleBillSelect}
            purchaseOrders={initialPurchaseOrders}
            selectedPurchaseOrderId={purchaseReturn.purchaseOrderId || ""}
            onSelectPurchaseOrder={handlePurchaseOrderSelect}
            returnDate={purchaseReturn.returnDate}
            onReturnDateChange={(val) => update({ returnDate: val })}
            reason={purchaseReturn.reason}
            onReasonChange={(val) => update({ reason: val })}
            errors={errors}
          />

          <PurchaseReturnItemsSection
            items={purchaseReturn.items}
            onUpdateLine={handleUpdateLine}
            onAddLine={handleAddLine}
            onRemoveLine={handleRemoveLine}
            availableProducts={initialProducts}
            remainingByBillItemId={remainingByBillItemId}
            errors={errors}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] items-stretch">
            <PurchaseReturnAdditionalInfoSection
              notes={purchaseReturn.notes || ""}
              onNotesChange={(val) => update({ notes: val })}
              terms={purchaseReturn.terms || ""}
              onTermsChange={(val) => update({ terms: val })}
            />

            <PurchaseReturnSummarySection
              totals={{ ...totals, ...taxSplit }}
              taxMode={purchaseReturn.taxMode}
              onTaxModeChange={(mode) => update({ taxMode: mode })}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
            <Link
              href="/purchase-returns"
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
            >
              <X size={15} />
              <span>Cancel</span>
            </Link>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-10 px-4 text-sm font-medium"
              >
                <Calendar size={16} className="text-text-muted" />
                <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-10 px-5 text-sm font-medium"
              >
                <CheckCircle2 size={16} />
                <span>
                  {isSubmitting ? "Saving..." : "Approve & Save Return"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
