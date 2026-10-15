"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, FileText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RECURRING_FREQUENCIES,
  type RecurringSchedule,
  type RecurringScheduleLineItem,
} from "../../domain/recurring-schedule";
import { anchorDayOf, advanceRecurrence } from "../../domain/rules/recurrence-rules";
import {
  calculateDueDate,
  calculateInvoiceTotals,
  determineTaxMode,
} from "@/features/invoices";
import {
  createRecurringScheduleAction,
  updateRecurringScheduleAction,
} from "../../data/mutations/recurring-schedule-mutations";
import { RecurringItemsSection, type CatalogueProductOption } from "../components/RecurringItemsSection";
import { RecurringChargesDiscount, RecurringSummary } from "../components/RecurringBillingSections";
import {
  RecurringInvoiceDetails,
  type RecurringCustomerOption,
  type RecurringCustomerSnapshot,
} from "../components/RecurringInvoiceDetails";
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

export type CustomerPickerOption = RecurringCustomerOption;

export type RecurringScheduleCreatePageProps = {
  initialCustomers?: CustomerPickerOption[];
  initialProducts?: CatalogueProductOption[];
  supplierState?: string;
  supplierGstin?: string;
  initialInvoiceNumber?: string;
  initialDefaultNotes?: string;
  initialDefaultTerms?: string;
  existingSchedule?: RecurringSchedule;
};

export const RecurringScheduleCreatePage = ({
  initialCustomers = [],
  initialProducts,
  supplierState = "27-Maharashtra",
  supplierGstin,
  initialInvoiceNumber = "",
  initialDefaultNotes = "",
  initialDefaultTerms = "",
  existingSchedule,
}: RecurringScheduleCreatePageProps) => {
  const router = useRouter();
  const isEdit = Boolean(existingSchedule);

  const [name, setName] = useState(() => existingSchedule?.name || "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    () => existingSchedule?.customerId || "",
  );
  const [frequency, setFrequency] = useState<RecurringSchedule["frequency"]>(
    () => existingSchedule?.frequency || "Monthly",
  );
  const [startDate, setStartDate] = useState(
    () => existingSchedule?.startDate || getTodayDateString(),
  );
  const [endDate, setEndDate] = useState(() => existingSchedule?.endDate || "");
  const [nextRunDate, setNextRunDate] = useState(
    () => existingSchedule?.nextRunDate || existingSchedule?.startDate || getTodayDateString(),
  );
  const [timezone, setTimezone] = useState(() => existingSchedule?.timezone || "Asia/Kolkata");
  const [paymentTerms, setPaymentTerms] = useState(
    () => existingSchedule?.paymentTerms || "Net 15 days",
  );
  const [additionalCharges, setAdditionalCharges] = useState(
    () => existingSchedule?.additionalCharges || 0,
  );
  const [additionalChargesLabel, setAdditionalChargesLabel] = useState(
    () => existingSchedule?.additionalChargesLabel || "",
  );
  const [additionalDiscount, setAdditionalDiscount] = useState(
    () => existingSchedule?.additionalDiscount || 0,
  );
  const [additionalDiscountType, setAdditionalDiscountType] = useState<"percentage" | "fixed">(
    () => existingSchedule?.additionalDiscountType || "fixed",
  );
  const [additionalDiscountLabel, setAdditionalDiscountLabel] = useState(
    () => existingSchedule?.additionalDiscountLabel || "",
  );
  const [notes, setNotes] = useState(
    () => (existingSchedule ? existingSchedule.notes : initialDefaultNotes),
  );
  const [terms, setTerms] = useState(
    () => (existingSchedule ? existingSchedule.terms : initialDefaultTerms),
  );
  const [items, setItems] = useState<RecurringScheduleLineItem[]>(
    () => existingSchedule?.items || [],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // In edit mode the stored snapshot remains selectable even if the customer
  // left the catalogue, so history is never orphaned in the UI.
  const customerOptions = useMemo<CustomerPickerOption[]>(() => {
    if (
      existingSchedule?.customerId &&
      !initialCustomers.some((c) => c.id === existingSchedule.customerId)
    ) {
      return [
        {
          id: existingSchedule.customerId,
          name: `${existingSchedule.customerName} (removed)`,
          email: existingSchedule.customerEmail,
          address: existingSchedule.customerAddress,
          gstin: existingSchedule.customerGstin,
          placeOfSupply: existingSchedule.customerPlaceOfSupply || "",
          paymentTerms: existingSchedule.paymentTerms,
        },
        ...initialCustomers,
      ];
    }
    return initialCustomers;
  }, [initialCustomers, existingSchedule]);

  const selectedOption = customerOptions.find((c) => c.id === selectedCustomerId);

  // Effective billing snapshot: the live selection, or the stored snapshot
  // when editing without re-selecting. Displayed read-only; captured at save.
  // No duplicate editable snapshot fields exist, so snapshots cannot drift.
  const snapshot: RecurringCustomerSnapshot | null = selectedOption
    ? {
        name: selectedOption.name,
        email: selectedOption.email,
        address: selectedOption.address,
        gstin: selectedOption.gstin,
        placeOfSupply: selectedOption.placeOfSupply,
        contactPerson: selectedOption.contactPerson,
        phone: selectedOption.phone,
        pan: selectedOption.pan,
      }
    : existingSchedule
      ? {
          name: existingSchedule.customerName,
          email: existingSchedule.customerEmail,
          address: existingSchedule.customerAddress,
          gstin: existingSchedule.customerGstin,
          placeOfSupply: existingSchedule.customerPlaceOfSupply || "",
        }
      : null;

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customerOptions.find((c) => c.id === customerId);
    if (customer && !isEdit) {
      setPaymentTerms(customer.paymentTerms || paymentTerms || "Net 15 days");
    }
    setErrors({});
    setSubmitError(null);
  };

  const updateLine = (id: string, patch: Partial<RecurringScheduleLineItem>) => {
    setItems((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => {
    const nextId = `line_${items.length + 1}_${Date.now().toString().slice(-4)}`;
    setItems((current) => [
      ...current,
      { id: nextId, item: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 18 },
    ]);
  };

  const removeLine = (id: string) => {
    if (items.length <= 1) return;
    setItems((current) => current.filter((line) => line.id !== id));
  };

  // Informational preview only — the server recomputes everything.
  const previewTaxMode = useMemo(() => {
    const decision = determineTaxMode({
      supplierState,
      supplierGstin,
      customerPlaceOfSupply: snapshot?.placeOfSupply || undefined,
      customerGstin: snapshot?.gstin || undefined,
      customerState: undefined,
      gstTreatment: undefined,
    });
    return decision.taxMode;
  }, [supplierState, supplierGstin, snapshot?.placeOfSupply, snapshot?.gstin]);

  const previewTotals = useMemo(
    () =>
      calculateInvoiceTotals({
        items: items.map((line) => ({
          id: line.id,
          item: line.item || "Untitled",
          description: line.description,
          hsnSac: line.hsnSac,
          quantity: Number.isFinite(line.quantity) ? line.quantity : 0,
          unitPrice: Number.isFinite(line.unitPrice) ? line.unitPrice : 0,
          discount: Number.isFinite(line.discount) ? line.discount : 0,
          taxRate: Number.isFinite(line.taxRate) ? line.taxRate : 0,
        })),
        amountPaid: 0,
        taxMode: previewTaxMode,
        additionalCharges,
        additionalDiscount,
        additionalDiscountType,
      }),
    [items, previewTaxMode, additionalCharges, additionalDiscount, additionalDiscountType],
  );

  const firstRunDate = isEdit ? nextRunDate : startDate;
  const secondRunDate = useMemo(() => {
    try {
      return advanceRecurrence({ frequency, fromDate: firstRunDate, anchorDay: anchorDayOf(startDate || firstRunDate) });
    } catch {
      return "";
    }
  }, [frequency, firstRunDate, startDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (name.trim().length < 2) {
      newErrors.name = "Schedule name must be at least 2 characters.";
    }
    if (!snapshot) {
      newErrors.customer = "Select a customer before saving.";
    }
    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    }
    if (endDate && endDate < startDate) {
      newErrors.endDate = "End date must be on or after the start date.";
    }
    if (isEdit && (!nextRunDate || nextRunDate < startDate)) {
      newErrors.nextRunDate = "Next run date must be on or after the start date.";
    }
    if (!timezone.trim()) {
      newErrors.timezone = "Timezone is required.";
    }
    if (items.length === 0) {
      newErrors.items = "Add at least one line item.";
    }
    if (previewTotals.total <= 0) {
      newErrors.total = "Scheduled invoice total must be greater than zero.";
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
      setSubmitError(Object.values(newErrors)[0] || "Please review the highlighted form errors.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !snapshot) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: name.trim(),
        customerId: selectedCustomerId || existingSchedule?.customerId || undefined,
        customerName: snapshot.name,
        customerEmail: snapshot.email || undefined,
        customerAddress: snapshot.address || undefined,
        customerGstin: snapshot.gstin || undefined,
        customerPlaceOfSupply: snapshot.placeOfSupply || undefined,
        frequency,
        startDate,
        endDate: endDate || undefined,
        ...(isEdit ? { nextRunDate } : {}),
        timezone: timezone.trim(),
        paymentTerms: paymentTerms.trim() || "Net 15 days",
        additionalCharges,
        additionalChargesLabel: additionalChargesLabel.trim() || undefined,
        additionalDiscount,
        additionalDiscountType,
        additionalDiscountLabel: additionalDiscountLabel.trim() || undefined,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        items: items.map((it) => ({
          id: it.id,
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

      const result = isEdit && existingSchedule
        ? await updateRecurringScheduleAction({ ...payload, id: existingSchedule.id })
        : await createRecurringScheduleAction(payload);

      if (!result.success) {
        setSubmitError(result.error || "Failed to save recurring schedule.");
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
        }
        setIsSubmitting(false);
        return;
      }

      if (!isEdit && result.data) {
        router.push(`/recurring-invoices/${result.data.id}`);
      } else {
        router.push("/recurring-invoices?saved=1");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* 1. Back Navigation — strictly above the page heading */}
      <div>
        <Link
          href="/recurring-invoices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-light transition-colors hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={16} />
          <span>Back to Recurring Invoices</span>
        </Link>
      </div>

      {/* 2. Page Heading & Actions Row */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {isEdit ? "Edit Recurring Schedule" : "Create Recurring Invoice"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {isEdit
              ? "Changes apply to future invoices only. Already generated invoices are never rewritten."
              : "Create a recurring customer invoice with items, taxes, and payment details."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSave}
            className="h-10 px-5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <CalendarClock size={16} />
            <span>{isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Schedule"}</span>
          </Button>
        </div>
      </header>

      {submitError && <FormError message={submitError} />}

      {/* 3. Invoice Details */}
      <RecurringInvoiceDetails
        customers={customerOptions}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={handleSelectCustomer}
        snapshot={snapshot}
        customerError={errors.customer}
        placeOfSupplyError={errors.placeOfSupply}
        invoiceNumberPreview={initialInvoiceNumber}
        paymentTerms={paymentTerms}
        onPaymentTermsChange={setPaymentTerms}
        taxTreatmentLabel={
          previewTaxMode === "IGST" ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)"
        }
      />

      {/* 4. Recurrence Settings */}
      <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
            aria-hidden="true"
          >
            <CalendarClock size={19} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
              Recurrence Settings
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              When and how often invoices are generated. Invoice content above applies to every run.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="schedule-name">Schedule Name *</Label>
          <Input
            id="schedule-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme monthly retainer"
            className="mt-1 h-10 text-sm"
          />
          {errors.name && <FieldError id="schedule-name-error" message={errors.name} />}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="schedule-frequency">Frequency *</Label>
            <Select
              id="schedule-frequency"
              value={frequency}
              onChange={(val) => setFrequency(val as RecurringSchedule["frequency"])}
              className="mt-1 h-10"
            >
              {RECURRING_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="schedule-start-date">Start Date *</Label>
            <div className="mt-1">
              <DatePicker
                id="schedule-start-date"
                value={startDate}
                onChange={setStartDate}
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={errors.startDate ? "schedule-start-date-error" : undefined}
              />
            </div>
            {errors.startDate && (
              <FieldError id="schedule-start-date-error" message={errors.startDate} />
            )}
          </div>
          <div>
            <Label htmlFor="schedule-end-date">End Date (optional)</Label>
            <div className="mt-1">
              <DatePicker
                id="schedule-end-date"
                value={endDate}
                onChange={setEndDate}
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={errors.endDate ? "schedule-end-date-error" : undefined}
              />
            </div>
            {errors.endDate && (
              <FieldError id="schedule-end-date-error" message={errors.endDate} />
            )}
          </div>
          <div>
            <Label htmlFor="schedule-timezone">Timezone *</Label>
            <Input
              id="schedule-timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Asia/Kolkata"
              className="mt-1 h-10 text-sm font-mono"
            />
            {errors.timezone && (
              <FieldError id="schedule-timezone-error" message={errors.timezone} />
            )}
          </div>
        </div>
        {isEdit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="schedule-next-run">Next Run Date *</Label>
              <div className="mt-1">
                <DatePicker
                  id="schedule-next-run"
                  value={nextRunDate}
                  onChange={setNextRunDate}
                  aria-invalid={Boolean(errors.nextRunDate)}
                  aria-describedby={errors.nextRunDate ? "schedule-next-run-error" : undefined}
                />
              </div>
              {errors.nextRunDate && (
                <FieldError id="schedule-next-run-error" message={errors.nextRunDate} />
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-text-muted">
          Billing day is anchored to the start date{secondRunDate ? ` — next two runs: ${firstRunDate}, ${secondRunDate}` : ` — first run: ${firstRunDate}`}.
          Short months clamp to their last day without moving the anchor. All missed periods are billed as separate invoices (up to 10 per run).
        </p>
      </section>

      {/* 5. Items Section — Full Width */}
      <RecurringItemsSection
        items={items}
        onUpdateLine={updateLine}
        onRemoveLine={removeLine}
        onAddLine={addLine}
        availableProducts={initialProducts}
        errors={errors}
      />

      {/* 6. Charges & Discount (left) and Invoice Summary (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] items-stretch">
        <RecurringChargesDiscount
          additionalCharges={additionalCharges}
          onAdditionalChargesChange={setAdditionalCharges}
          additionalChargesLabel={additionalChargesLabel}
          onAdditionalChargesLabelChange={setAdditionalChargesLabel}
          additionalDiscount={additionalDiscount}
          onAdditionalDiscountChange={setAdditionalDiscount}
          additionalDiscountType={additionalDiscountType}
          onAdditionalDiscountTypeChange={setAdditionalDiscountType}
          additionalDiscountLabel={additionalDiscountLabel}
          onAdditionalDiscountLabelChange={setAdditionalDiscountLabel}
        />
        <RecurringSummary
          totals={previewTotals}
          taxMode={previewTaxMode}
          firstRunDate={firstRunDate}
          firstDueDate={calculateDueDate(firstRunDate, paymentTerms)}
          invoiceNumberPreview={initialInvoiceNumber}
          items={items}
        />
      </div>

      {/* 7. Additional Information Section — Full Width below */}
      <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
            aria-hidden="true"
          >
            <FileText size={19} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
              Additional Information
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Printed on every generated invoice, exactly like ordinary invoices.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Label
              htmlFor="schedule-notes-textarea"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Notes to Customer
            </Label>
            <Textarea
              id="schedule-notes-textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes..."
              className="min-h-24 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <Label
              htmlFor="schedule-terms-textarea"
              className="mb-1.5 block text-xs font-medium text-text-secondary"
            >
              Terms and Conditions
            </Label>
            <Textarea
              id="schedule-terms-textarea"
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Enter terms and conditions..."
              className="min-h-24 px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>
      </section>

      {/* 8. Bottom Submit Error Alert */}
      {submitError && <FormError message={submitError} />}

      {/* 9. Bottom Action Bar */}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/recurring-invoices"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
        >
          <X size={15} />
          <span>Cancel</span>
        </Link>

        <Button
          variant="primary"
          disabled={isSubmitting}
          onClick={handleSave}
          className="h-10 px-5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
        >
          <CalendarClock size={16} />
          <span>{isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Schedule"}</span>
        </Button>
      </div>
    </section>
  );
};
