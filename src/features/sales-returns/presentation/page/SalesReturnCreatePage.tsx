"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/form";
import type {
  ReturnableInvoice,
  SalesReturn,
} from "../../domain/entities/sales-return";
import { calculateReturnLineTotals } from "../../domain/rules/sales-return-rules";
import { createSalesReturnAction } from "../../data/mutations/create-sales-return";
import { updateSalesReturnStatusAction } from "../../data/mutations/update-sales-return-status";
import { SalesReturnStatusBadge } from "../components/SalesReturnStatusBadge";
import { SalesReturnDocument } from "../components/SalesReturnDocument";
import {
  SalesReturnCustomerSection,
} from "../components/SalesReturnCustomerSection";
import {
  SalesReturnItemsSection,
  type ReturnLineState,
} from "../components/SalesReturnItemsSection";
import {
  SalesReturnSummarySection,
  type SalesReturnTotals,
} from "../components/SalesReturnSummarySection";
import {
  SalesReturnAdditionalInfoSection,
} from "../components/SalesReturnAdditionalInfoSection";

export type SalesReturnCreatePageProps = {
  returnableInvoices: ReturnableInvoice[];
  defaultNumberPreview: string;
  defaultReason?: string | null;
  defaultPolicy?: string | null;
};

export const SalesReturnCreatePage = ({
  returnableInvoices,
  defaultNumberPreview,
  defaultReason,
  defaultPolicy,
}: SalesReturnCreatePageProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [preview, setPreview] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Document Info
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [returnNumber, setReturnNumber] = useState<string>(defaultNumberPreview);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [customerPlaceOfSupply, setCustomerPlaceOfSupply] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [reason, setReason] = useState<string>(
    defaultReason || "Defective or damaged in transit",
  );
  const [taxMode, setTaxMode] = useState<string>("CGST_SGST");
  const [currency, setCurrency] = useState<string>("INR (₹)");
  const [notes, setNotes] = useState<string>(defaultPolicy || "");

  // Line items
  const [items, setItems] = useState<ReturnLineState[]>([]);

  const selectedInvoice = useMemo(() => {
    return returnableInvoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [returnableInvoices, selectedInvoiceId]);

  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    setFormError(null);
    setFieldErrors({});

    if (!invId) {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerAddress("");
      setCustomerGstin("");
      setCustomerPlaceOfSupply("");
      setItems([]);
      return;
    }

    const inv = returnableInvoices.find((i) => i.id === invId);
    if (!inv) return;

    setCustomerName(inv.customerName);
    setCustomerEmail(inv.customerEmail || "");
    setCustomerAddress(inv.customerAddress || "");
    setCustomerGstin(inv.customerGstin || "");
    setCustomerPlaceOfSupply(inv.customerPlaceOfSupply || "");
    setTaxMode(inv.taxMode);
    setCurrency(inv.currency);

    const newItems: ReturnLineState[] = inv.items
      .filter((it) => it.remainingReturnableQuantity > 0)
      .map((it) => ({
        invoiceItemId: it.id,
        productId: it.productId,
        item: it.item,
        description: it.description || "",
        hsnSac: it.hsnSac || "",
        unit: it.unit || "PCS",
        soldQuantity: it.soldQuantity,
        previouslyReturnedQuantity: it.previouslyReturnedQuantity,
        remainingReturnableQuantity: it.remainingReturnableQuantity,
        returnQuantity: String(it.remainingReturnableQuantity),
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        disposition: "RESTOCK",
        reason: "",
      }));

    setItems(newItems);
  };

  const handleItemFieldChange = <K extends keyof ReturnLineState>(
    index: number,
    field: K,
    value: ReturnLineState[K],
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
        invoiceItemId: null,
        productId: null,
        item: "New Item",
        description: "",
        hsnSac: "",
        unit: "PCS",
        soldQuantity: 1,
        previouslyReturnedQuantity: 0,
        remainingReturnableQuantity: 999999,
        returnQuantity: "1",
        unitPrice: 0,
        discount: 0,
        taxRate: 18,
        disposition: "RESTOCK",
        reason: "",
      },
    ]);
  };

  // Financial Calculations
  const totals: SalesReturnTotals = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;

    for (const line of items) {
      const qty = parseFloat(line.returnQuantity) || 0;
      if (qty > 0) {
        const lineTotals = calculateReturnLineTotals({
          quantity: qty,
          unitPrice: line.unitPrice,
          discount: line.discount,
          taxRate: line.taxRate,
        });
        subtotal += lineTotals.taxableAmount;
        taxAmount += lineTotals.taxAmount;
      }
    }

    const roundedSubtotal = Number(subtotal.toFixed(2));
    const roundedTaxAmount = Number(taxAmount.toFixed(2));
    const totalAmount = Number((roundedSubtotal + roundedTaxAmount).toFixed(2));

    const isInterState = taxMode === "IGST";
    const cgst = isInterState ? 0 : Number((roundedTaxAmount / 2).toFixed(2));
    const sgst = isInterState ? 0 : Number((roundedTaxAmount - cgst).toFixed(2));
    const igst = isInterState ? roundedTaxAmount : 0;

    return {
      subtotal: roundedSubtotal,
      taxAmount: roundedTaxAmount,
      cgst,
      sgst,
      igst,
      totalAmount,
    };
  }, [items, taxMode]);

  // Ephemeral SalesReturn model for live document preview
  const previewReturn: SalesReturn = useMemo(() => {
    return {
      id: "preview-id",
      organizationId: "org-preview",
      returnNumber: returnNumber || defaultNumberPreview,
      customerId: selectedInvoice?.customerId || null,
      customerName: customerName || "Customer Name",
      customerEmail: customerEmail || null,
      customerAddress: customerAddress || null,
      customerGstin: customerGstin || null,
      customerPlaceOfSupply: customerPlaceOfSupply || null,
      invoiceId: selectedInvoiceId || null,
      invoiceNumber: selectedInvoice?.invoiceNumber || null,
      salesOrderId: null,
      salesOrderNumber: null,
      creditNoteId: null,
      creditNoteNumber: null,
      returnDate: new Date(returnDate),
      reason,
      status: "DRAFT",
      taxMode,
      currency,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: items.map((it, idx) => {
        const qty = parseFloat(it.returnQuantity) || 0;
        const lineTotals = calculateReturnLineTotals({
          quantity: qty,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
        });
        return {
          id: `preview-item-${idx}`,
          salesReturnId: "preview-id",
          productId: it.productId,
          invoiceItemId: it.invoiceItemId,
          item: it.item,
          description: it.description || null,
          hsnSac: it.hsnSac || null,
          soldQuantity: it.soldQuantity,
          returnQuantity: qty,
          receivedQuantity: 0,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
          taxAmount: lineTotals.taxAmount,
          lineTotal: lineTotals.lineTotal,
          disposition: it.disposition,
          reason: it.reason || null,
          sortOrder: idx,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
    };
  }, [
    returnNumber,
    defaultNumberPreview,
    selectedInvoice,
    customerName,
    customerEmail,
    customerAddress,
    customerGstin,
    customerPlaceOfSupply,
    selectedInvoiceId,
    returnDate,
    reason,
    taxMode,
    currency,
    totals,
    notes,
    items,
  ]);

  const handleSave = (targetStatus: "DRAFT" | "APPROVED") => {
    setFormError(null);
    setFieldErrors({});

    if (!customerName.trim()) {
      setFormError("Customer name is required.");
      setFieldErrors({ customerName: "Customer name is required." });
      return;
    }

    if (!reason.trim()) {
      setFormError("Return reason is required.");
      setFieldErrors({ reason: "Return reason is required." });
      return;
    }

    if (!returnDate.trim()) {
      setFormError("Return date is required.");
      setFieldErrors({ returnDate: "Return date is required." });
      return;
    }

    if (items.length === 0) {
      setFormError("At least one line item must be included in the return.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const q = parseFloat(it.returnQuantity);
      if (isNaN(q) || q <= 0) {
        setFormError(`Line ${i + 1} (${it.item}) must have a return quantity greater than 0.`);
        return;
      }
      if (it.remainingReturnableQuantity < 900000 && q > it.remainingReturnableQuantity + 0.0001) {
        setFormError(
          `Line ${i + 1} (${it.item}): Return quantity (${q}) cannot exceed remaining returnable quantity (${it.remainingReturnableQuantity}).`,
        );
        return;
      }
    }

    startTransition(async () => {
      const result = await createSalesReturnAction({
        customerId: selectedInvoice?.customerId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        customerAddress: customerAddress.trim() || null,
        customerGstin: customerGstin.trim() || null,
        customerPlaceOfSupply: customerPlaceOfSupply.trim() || null,
        invoiceId: selectedInvoiceId || null,
        salesOrderId: null,
        returnDate,
        reason: reason.trim(),
        taxMode,
        currency,
        notes: notes.trim() || null,
        items: items.map((it, idx) => ({
          invoiceItemId: it.invoiceItemId,
          productId: it.productId,
          item: it.item.trim(),
          description: it.description.trim() || null,
          hsnSac: it.hsnSac.trim() || null,
          soldQuantity: it.soldQuantity,
          returnQuantity: parseFloat(it.returnQuantity),
          receivedQuantity: 0,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
          disposition: it.disposition,
          reason: it.reason.trim() || null,
          sortOrder: idx,
        })),
      });

      if (!result.success) {
        setFormError(result.error || "Failed to create sales return.");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      if (result.data) {
        if (targetStatus === "APPROVED") {
          const approveRes = await updateSalesReturnStatusAction(result.data.id, {
            status: "APPROVED",
            createCreditNote: true,
          });
          if (!approveRes.success) {
            setFormError(approveRes.error || "Created return draft, but failed to approve.");
            router.push(`/sales-returns/${result.data.id}`);
            return;
          }
        }
        router.push(`/sales-returns/${result.data.id}`);
      }
    });
  };

  return (
    <section className="space-y-6">
      {/* 1. Back Navigation Link */}
      <div>
        <Link
          href="/sales-returns"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Sales Returns
        </Link>
      </div>

      {/* 2. Page Header & Actions matching SalesOrderCreatePage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              New Sales Return
            </h1>
            <SalesReturnStatusBadge status="DRAFT" />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Authorize customer returns against invoiced sales with item inspection, disposition, and credit adjustments.
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
            onClick={() => handleSave("DRAFT")}
            disabled={isPending}
            className="h-10 px-4 text-sm font-medium"
          >
            <Calendar size={16} className="text-text-muted" />
            <span>{isPending ? "Saving..." : "Save as Draft"}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => handleSave("APPROVED")}
            disabled={isPending}
            className="h-10 px-4 text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            <span>{isPending ? "Saving..." : "Confirm & Authorize"}</span>
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
              Showing live document preview of this sales return authorization.
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
          <SalesReturnDocument salesReturn={previewReturn} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Customer & Return Details */}
          <SalesReturnCustomerSection
            returnableInvoices={returnableInvoices}
            selectedInvoiceId={selectedInvoiceId}
            onSelectInvoice={handleInvoiceSelect}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerEmail={customerEmail}
            customerAddress={customerAddress}
            customerGstin={customerGstin}
            customerPlaceOfSupply={customerPlaceOfSupply}
            returnNumber={returnNumber}
            onReturnNumberChange={setReturnNumber}
            returnDate={returnDate}
            onReturnDateChange={setReturnDate}
            reason={reason}
            onReasonChange={setReason}
            fieldErrors={fieldErrors}
          />

          {/* Section 2: Return Line Items */}
          <SalesReturnItemsSection
            items={items}
            onUpdateLine={handleItemFieldChange}
            onAddLine={handleAddManualItem}
            onRemoveLine={handleRemoveItem}
            fieldErrors={fieldErrors}
          />

          {/* Section 3: Side-by-Side: Policy Notes & Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
            <SalesReturnAdditionalInfoSection
              notes={notes}
              onNotesChange={setNotes}
            />

            <SalesReturnSummarySection
              totals={totals}
              taxMode={taxMode}
              onTaxModeChange={setTaxMode}
              currency={currency}
            />
          </div>

          {/* Section 4: Bottom Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
            <Link
              href="/sales-returns"
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
            >
              <X size={15} />
              <span>Cancel</span>
            </Link>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSave("DRAFT")}
                disabled={isPending}
                className="w-full sm:w-auto h-10 px-4 text-sm font-medium"
              >
                <Calendar size={16} className="text-text-muted" />
                <span>{isPending ? "Saving..." : "Save as Draft"}</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => handleSave("APPROVED")}
                disabled={isPending}
                className="w-full sm:w-auto h-10 px-5 text-sm font-medium"
              >
                <CheckCircle2 size={16} />
                <span>{isPending ? "Saving..." : "Confirm & Authorize"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
