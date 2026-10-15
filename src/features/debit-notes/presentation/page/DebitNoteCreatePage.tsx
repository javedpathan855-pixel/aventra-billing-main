"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Eye, FileText, Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateDebitNoteTotals,
  formatDebitNoteCurrency,
  DEBIT_NOTE_REASONS,
  type DebitNote,
  type DebitNoteLineItem,
} from "../../domain/debit-note";
import {
  createDebitNoteAction,
  updateDebitNoteAction,
} from "../../data/mutations/debit-note-mutations";
import type { EligibleInvoiceForDebitDto } from "../../data/dto/debit-note-dto";
import { DebitNoteItemsSection } from "../components/DebitNoteItemsSection";
import { DebitNoteDocument } from "../components/DebitNoteDocument";
import {
  Button,
  DatePicker,
  FieldError,
  FormError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/shared/components/form";

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type DebitNoteCreatePageProps = {
  eligibleInvoices?: EligibleInvoiceForDebitDto[];
  preselectedInvoiceId?: string;
  initialInvoiceId?: string;
  previewDebitNoteNumber?: string;
  initialDefaultNotes?: string;
  initialDefaultTerms?: string;
  supplierName?: string;
  existingDebitNote?: DebitNote;
};

export const DebitNoteCreatePage = ({
  eligibleInvoices = [],
  preselectedInvoiceId,
  initialInvoiceId: initialInvoiceIdProp,
  previewDebitNoteNumber = "DN-0001",
  initialDefaultNotes = "",
  initialDefaultTerms = "",
  supplierName,
  existingDebitNote,
}: DebitNoteCreatePageProps) => {
  const router = useRouter();

  const candidateId = preselectedInvoiceId || initialInvoiceIdProp;
  // Only preselect if editing existing note or when trusted preselectedInvoiceId is present and in eligible list
  const initialInvoiceId =
    existingDebitNote?.invoiceId ||
    (candidateId && eligibleInvoices.some((inv) => inv.id === candidateId)
      ? candidateId
      : "");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoiceId);
  const selectedInvoice = useMemo(
    () => eligibleInvoices.find((inv) => inv.id === selectedInvoiceId),
    [eligibleInvoices, selectedInvoiceId],
  );

  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Debit Note Form State
  const [debitNoteNumber, setDebitNoteNumber] = useState<string>(
    () => existingDebitNote?.debitNoteNumber || previewDebitNoteNumber || "",
  );
  const [issueDate, setIssueDate] = useState<string>(
    () => existingDebitNote?.issueDate || getTodayDateString(),
  );
  const [reason, setReason] = useState<string>(
    () => existingDebitNote?.reason || DEBIT_NOTE_REASONS[0] || "Under-billing correction",
  );
  const [customReason, setCustomReason] = useState<string>("");
  const [notes, setNotes] = useState<string>(
    () => existingDebitNote?.notes ?? initialDefaultNotes,
  );
  const [terms, setTerms] = useState<string>(
    () => existingDebitNote?.terms ?? initialDefaultTerms,
  );

  // Initialize Line Items: empty if no invoice is selected; populate from invoice when selected
  const [items, setItems] = useState<DebitNoteLineItem[]>(() => {
    if (existingDebitNote) {
      return existingDebitNote.items;
    }
    const initialInv = eligibleInvoices.find((inv) => inv.id === initialInvoiceId);
    if (initialInv && initialInv.items.length > 0) {
      return initialInv.items.map((it, idx) => ({
        id: `dn_line_${idx + 1}_${Date.now()}`,
        invoiceItemId: it.id,
        productId: it.productId,
        item: it.item,
        description: it.description || "",
        hsnSac: it.hsnSac,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
      }));
    }
    return [];
  });

  // When user switches invoice, re-seed items from that invoice or clear if unselected
  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const inv = eligibleInvoices.find((i) => i.id === invoiceId);
    if (inv && inv.items.length > 0) {
      setItems(
        inv.items.map((it, idx) => ({
          id: `dn_line_${idx + 1}_${Date.now()}`,
          invoiceItemId: it.id,
          productId: it.productId,
          item: it.item,
          description: it.description || "",
          hsnSac: it.hsnSac,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
        })),
      );
    } else {
      setItems([]);
    }
    setErrors({});
    setSubmitError(null);
  };

  const updateLine = (id: string, patch: Partial<DebitNoteLineItem>) => {
    setItems((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => {
    const nextId = `dn_line_${items.length + 1}_${Date.now().toString().slice(-4)}`;
    setItems((current) => [
      ...current,
      {
        id: nextId,
        item: "Additional Charge",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: 18,
      },
    ]);
  };

  const restoreLine = (orig: {
    id: string;
    item: string;
    description?: string;
    hsnSac?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
  }) => {
    const nextId = `dn_line_${items.length + 1}_${Date.now().toString().slice(-4)}`;
    setItems((current) => [
      ...current,
      {
        id: nextId,
        invoiceItemId: orig.id,
        item: orig.item,
        description: orig.description || "",
        hsnSac: orig.hsnSac,
        quantity: orig.quantity,
        unitPrice: orig.unitPrice,
        discount: orig.discount,
        taxRate: orig.taxRate,
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (items.length <= 1) return;
    setItems((current) => current.filter((line) => line.id !== id));
  };

  const totals = useMemo(
    () =>
      calculateDebitNoteTotals({
        items,
        taxMode: selectedInvoice?.taxMode || "CGST_SGST",
      }),
    [items, selectedInvoice?.taxMode],
  );

  // Compute remaining balance check
  const remainingAllowance = useMemo(() => {
    if (!selectedInvoice) return 0;
    // If editing existing draft, this draft's prior total is included in allowance
    const priorDraftAmount = existingDebitNote ? existingDebitNote.total : 0;
    return selectedInvoice.remainingDebitableAmount + priorDraftAmount;
  }, [selectedInvoice, existingDebitNote]);

  const isOverDebited = totals.total > remainingAllowance + 0.001;

  const effectiveReason = reason === "Other" && customReason.trim() ? customReason.trim() : reason;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedInvoiceId) {
      newErrors.invoiceId = "Select an original invoice to debit.";
    }
    if (!issueDate) {
      newErrors.issueDate = "Issue date is required.";
    }
    if (!effectiveReason.trim()) {
      newErrors.reason = "Debit reason is required.";
    }
    if (items.length === 0) {
      newErrors.items = "Add at least one line item.";
    }
    if (totals.total <= 0) {
      newErrors.total = "Debit note total must be greater than zero.";
    }
    if (isOverDebited) {
      newErrors.total = `Debit note amount (${formatDebitNoteCurrency(
        totals.total,
      )}) exceeds available invoice balance (${formatDebitNoteCurrency(remainingAllowance)}).`;
    }

    items.forEach((line, index) => {
      if (!line.item.trim()) {
        newErrors[`item-${index}`] = "Item name is required.";
      }
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        newErrors[`quantity-${index}`] = "Quantity must be > 0.";
      }
      if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
        newErrors[`price-${index}`] = "Price cannot be negative.";
      }
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setSubmitError(
        Object.values(newErrors)[0] || "Please review the highlighted form errors.",
      );
      setPreview(false);
      return false;
    }
    return true;
  };

  const handleSave = async (statusToSet: "Draft" | "Issued") => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        invoiceId: selectedInvoiceId,
        debitNoteNumber: existingDebitNote ? debitNoteNumber.trim() : undefined,
        issueDate,
        status: statusToSet,
        reason: effectiveReason,
        notes,
        terms,
        items: items.map((it) => ({
          id: it.id,
          invoiceItemId: it.invoiceItemId,
          productId: it.productId,
          item: it.item,
          description: it.description,
          hsnSac: it.hsnSac,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
        })),
      };

      const result = existingDebitNote
        ? await updateDebitNoteAction({ ...payload, id: existingDebitNote.id })
        : await createDebitNoteAction(payload);

      if (!result.success) {
        setSubmitError(result.error || "Failed to save debit note.");
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
        }
        setIsSubmitting(false);
        return;
      }

      if (statusToSet === "Issued") {
        router.push(`/debit-notes/${result.data?.id}`);
      } else {
        router.push("/debit-notes?saved=1");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  // Preview Mode
  if (preview && selectedInvoice) {
    const previewModel: DebitNote = {
      id: existingDebitNote?.id || "preview-id",
      debitNoteNumber: debitNoteNumber || previewDebitNoteNumber,
      invoiceId: selectedInvoice.id,
      invoiceNumber: selectedInvoice.invoiceNumber,
      customerId: selectedInvoice.customerId,
      customerName: selectedInvoice.customerName,
      customerEmail: selectedInvoice.customerEmail || "",
      customerAddress: selectedInvoice.customerAddress || "",
      customerGstin: selectedInvoice.customerGstin || "",
      customerPlaceOfSupply: selectedInvoice.customerPlaceOfSupply,
      issueDate,
      status: "Draft",
      reason: effectiveReason,
      taxMode: selectedInvoice.taxMode,
      currency: "INR (₹)",
      subtotal: totals.subtotal,
      lineDiscountTotal: totals.discount,
      taxableAmount: totals.taxable,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      totalTax: totals.tax,
      total: totals.total,
      notes,
      terms,
      items,
    };

    return (
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="link" onClick={() => setPreview(false)} className="gap-2 self-start">
            <ArrowLeft size={16} />
            <span>Back to edit</span>
          </Button>
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              disabled={isSubmitting || isOverDebited}
              onClick={() => handleSave("Draft")}
              className="h-10 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Calendar size={16} className="text-text-muted" />
              <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
            </Button>
            <Button
              variant="primary"
              disabled={isSubmitting || isOverDebited}
              onClick={() => handleSave("Issued")}
              className="h-10 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? "Issuing..." : "Issue Debit Note"}</span>
            </Button>
          </div>
        </div>
        <DebitNoteDocument debitNote={previewModel} supplierName={supplierName} />
      </section>
    );
  }

  // Guard: No eligible invoices to debit
  if (eligibleInvoices.length === 0 && !existingDebitNote) {
    return (
      <section className="space-y-6">
        <div>
          <Link
            href="/debit-notes"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-light transition-colors hover:text-primary-foreground"
          >
            <ArrowLeft size={16} />
            <span>Back to Debit Notes</span>
          </Link>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-surface-card px-6 py-16 text-center">
          <FileText className="mx-auto text-text-muted" size={28} />
          <h2 className="mt-4 font-heading text-xl font-semibold text-text-primary">
            No eligible invoices found
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            Debit notes can only be issued against issued, partially paid, or paid invoices.
            Please issue an invoice first before creating a debit note.
          </p>
          <Link
            href="/invoices"
            className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary-light active:bg-primary-dark"
          >
            <span>View Invoices</span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* 1. Back Navigation */}
      <div>
        <Link
          href="/debit-notes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-light transition-colors hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={16} />
          <span>Back to Debit Notes</span>
        </Link>
      </div>

      {/* 2. Page Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {existingDebitNote ? "Edit Draft Debit Note" : "Create Debit Note"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Record additional charges or value increments against an eligible customer invoice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            disabled={isSubmitting || isOverDebited}
            onClick={() => handleSave("Draft")}
            className="h-10 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Calendar size={16} className="text-text-muted" />
            <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              if (validateForm()) setPreview(true);
            }}
            className="h-10 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Eye size={16} className="text-text-muted" />
            <span>Preview</span>
          </Button>

          <Button
            variant="primary"
            disabled={isSubmitting || isOverDebited}
            onClick={() => handleSave("Issued")}
            className="h-10 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? "Issuing..." : "Issue Debit Note"}</span>
          </Button>
        </div>
      </header>

      {/* Global Submit Error Banner */}
      {submitError && <FormError message={submitError} />}

      {/* Over-debit warning banner */}
      {isOverDebited && (
        <div
          className="rounded-lg border border-error/40 bg-error/15 px-4 py-3 text-sm text-error flex items-start gap-3"
          role="alert"
        >
          <Info size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Debit Limit Exceeded</p>
            <p className="mt-0.5 text-xs text-error/90">
              The total debit amount ({formatDebitNoteCurrency(totals.total)}) exceeds the
              remaining eligible debit balance ({formatDebitNoteCurrency(remainingAllowance)})
              for invoice {selectedInvoice?.invoiceNumber}. Please reduce quantities or amounts.
            </p>
          </div>
        </div>
      )}

      {/* 3. Original Invoice Selection & Snapshot Card */}
      <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          1. Original Invoice & Customer Reference
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Invoice Selection */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Label htmlFor="original-invoice-select">Select Original Invoice *</Label>
            <Select
              id="original-invoice-select"
              value={selectedInvoiceId}
              disabled={Boolean(existingDebitNote)}
              onChange={(val) => handleSelectInvoice(val)}
              className="mt-1 h-10"
            >
              <option value="">Select original invoice</option>
              {eligibleInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customerName} ({formatDebitNoteCurrency(inv.total)})
                </option>
              ))}
            </Select>
            {errors.invoiceId && (
              <FieldError id="original-invoice-select-error" message={errors.invoiceId} />
            )}
          </div>

          {/* Issue Date */}
          <div>
            <Label htmlFor="debit-note-date">Debit Note Issue Date *</Label>
            <div className="mt-1">
              <DatePicker
                id="debit-note-date"
                value={issueDate}
                onChange={setIssueDate}
                aria-invalid={Boolean(errors.issueDate)}
                aria-describedby={errors.issueDate ? "debit-note-date-error" : undefined}
              />
            </div>
            {errors.issueDate && (
              <FieldError id="debit-note-date-error" message={errors.issueDate} />
            )}
          </div>

          {/* Debit Note Number */}
          <div>
            <Label htmlFor="debit-note-number">Debit Note Number</Label>
            <Input
              id="debit-note-number"
              type="text"
              value={debitNoteNumber}
              onChange={(e) => setDebitNoteNumber(e.target.value)}
              readOnly={!existingDebitNote}
              disabled={!existingDebitNote}
              placeholder={previewDebitNoteNumber || "Auto-allocated sequence"}
              className="mt-1 h-10 text-sm font-mono opacity-80"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              {existingDebitNote
                ? "Saved debit note identifier."
                : "Allocated automatically on save from Billing Settings sequence."}
            </p>
          </div>
        </div>

        {/* Selected Invoice Metadata Tile */}
        {selectedInvoice ? (
          <div className="mt-4 rounded-lg border border-border/80 bg-surface-alt/40 p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <span className="text-text-muted block">Customer</span>
              <span className="font-semibold text-text-primary text-sm mt-0.5 block">
                {selectedInvoice.customerName}
              </span>
              {selectedInvoice.customerGstin && (
                <span className="text-text-secondary block mt-0.5">
                  GSTIN: {selectedInvoice.customerGstin}
                </span>
              )}
            </div>

            <div>
              <span className="text-text-muted block">Original Invoice Total</span>
              <span className="font-semibold text-text-primary text-sm mt-0.5 block tabular-nums">
                {formatDebitNoteCurrency(selectedInvoice.total)}
              </span>
              <span className="text-text-secondary block mt-0.5">
                Tax: {selectedInvoice.taxMode === "IGST" ? "IGST" : "CGST + SGST"}
              </span>
            </div>

            <div>
              <span className="text-text-muted block">Previously Debited</span>
              <span className="font-semibold text-text-primary text-sm mt-0.5 block tabular-nums">
                {formatDebitNoteCurrency(selectedInvoice.debitedTotal)}
              </span>
              <span className="text-text-secondary block mt-0.5">
                From issued notes
              </span>
            </div>

            <div className="rounded-md bg-surface p-2.5 border border-border/60">
              <span className="text-text-muted block font-medium">Available Debit Limit</span>
              <span className="font-bold text-success text-base mt-0.5 block tabular-nums">
                {formatDebitNoteCurrency(remainingAllowance)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-muted">
            Select an original invoice above to load invoice details, line items, and debitable balance.
          </div>
        )}

        {/* Debit Reason */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
          <div>
            <Label htmlFor="debit-reason-select">Reason for Debit Note *</Label>
            <Select
              id="debit-reason-select"
              value={reason}
              onChange={(val) => setReason(val)}
              className="mt-1 h-10"
            >
              {DEBIT_NOTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="Other">Other (Custom specification)</option>
            </Select>
          </div>

          {reason === "Other" && (
            <div>
              <Label htmlFor="custom-debit-reason">Specific Reason Details *</Label>
              <Input
                id="custom-debit-reason"
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific business reason..."
                className="mt-1 h-10 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Line Items Section */}
      <DebitNoteItemsSection
        items={items}
        onUpdateLine={updateLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        originalInvoiceItems={selectedInvoice?.items}
        onRestoreLine={restoreLine}
        errors={errors}
      />

      {/* 5. Summary & Totals Box */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Notes and Terms */}
        <div className="space-y-4 rounded-xl border border-border bg-surface-card p-4 sm:p-5">
          <div>
            <Label htmlFor="debit-notes-notes">Internal Notes & Remarks</Label>
            <Textarea
              id="debit-notes-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal remarks or client notes..."
              rows={3}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="debit-notes-terms">Terms & Conditions</Label>
            <Textarea
              id="debit-notes-terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Terms of additional billing..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl border border-border bg-surface-card p-4 sm:p-6 space-y-3">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Debit Summary & Taxes
          </h3>

          <div className="space-y-2 border-b border-border/70 pb-3 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Items Subtotal</span>
              <span className="tabular-nums font-medium text-text-primary">
                {formatDebitNoteCurrency(totals.subtotal)}
              </span>
            </div>

            {totals.discount > 0 && (
              <div className="flex justify-between text-text-secondary">
                <span>Total Discount</span>
                <span className="tabular-nums text-text-muted">
                  −{formatDebitNoteCurrency(totals.discount)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-text-secondary">
              <span>Taxable Debit Amount</span>
              <span className="tabular-nums font-medium text-text-primary">
                {formatDebitNoteCurrency(totals.taxable)}
              </span>
            </div>

            {selectedInvoice?.taxMode === "IGST" ? (
              <div className="flex justify-between text-text-secondary">
                <span>IGST Total</span>
                <span className="tabular-nums font-medium text-text-primary">
                  {formatDebitNoteCurrency(totals.igst)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-text-secondary">
                  <span>CGST</span>
                  <span className="tabular-nums font-medium text-text-primary">
                    {formatDebitNoteCurrency(totals.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>SGST</span>
                  <span className="tabular-nums font-medium text-text-primary">
                    {formatDebitNoteCurrency(totals.sgst)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between items-center rounded-lg bg-surface-alt px-3.5 py-3 text-base font-bold">
            <span className="text-text-primary">Total Debit</span>
            <span className="text-primary-light text-lg tabular-nums">
              {formatDebitNoteCurrency(totals.total)}
            </span>
          </div>

          <div className="pt-2 text-xs text-text-muted flex justify-between">
            <span>Remaining after this note:</span>
            <span
              className={`font-semibold tabular-nums ${
                isOverDebited ? "text-error" : "text-text-secondary"
              }`}
            >
              {formatDebitNoteCurrency(Math.max(0, remainingAllowance - totals.total))}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Bottom Actions Bar */}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/debit-notes"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
        >
          <X size={15} />
          <span>Cancel</span>
        </Link>

        <Button
          variant="secondary"
          disabled={isSubmitting || isOverDebited}
          onClick={() => handleSave("Draft")}
          className="h-10 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Calendar size={16} className="text-text-muted" />
          <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
        </Button>

        <Button
          variant="secondary"
          onClick={() => {
            if (validateForm()) setPreview(true);
          }}
          className="h-10 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <Eye size={16} className="text-text-muted" />
          <span>Preview</span>
        </Button>

        <Button
          variant="primary"
          disabled={isSubmitting || isOverDebited}
          onClick={() => handleSave("Issued")}
          className="h-10 px-5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <CheckCircle2 size={16} />
          <span>{isSubmitting ? "Issuing..." : "Issue Debit Note"}</span>
        </Button>
      </div>
    </section>
  );
};
