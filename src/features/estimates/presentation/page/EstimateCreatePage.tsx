"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerDto } from "@/features/customers";
import type { ProductDto } from "@/features/products";
import type { SalesSettings } from "@/features/sales-settings";
import {
  calculateEstimateTotals,
  calculateValidUntilDate,
  getTodayDateString,
  validateEstimate,
} from "../../domain/rules/estimate-rules";
import { determineTaxMode } from "@/features/invoices";
import type {
  Estimate,
  EstimateLineItem,
  EstimateStatus,
} from "../../domain/entities/estimate";
import { formatCustomerAddress } from "@/features/customers";
import {
  createEstimateAction,
  updateEstimateAction,
} from "../../data/mutations/estimate-mutations";
import {
  EstimateCustomerSection,
  type SampleCustomer,
} from "../components/EstimateCustomerSection";
import { EstimateItemsSection } from "../components/EstimateItemsSection";
import { EstimateAdditionalChargesAndDiscountSection } from "../components/EstimateAdditionalChargesAndDiscountSection";
import { EstimateSummarySection } from "../components/EstimateSummarySection";
import { EstimateAdditionalInfoSection } from "../components/EstimateAdditionalInfoSection";
import { EstimateDocument } from "../components/EstimateDocument";
import { Button } from "@/shared/components/form";

const initialLine = (id = "line-1"): EstimateLineItem => ({
  id,
  item: "",
  description: "",
  hsnSac: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  taxRate: 18,
});

export type EstimateCreatePageProps = {
  initialCustomers?: CustomerDto[];
  initialProducts?: ProductDto[];
  supplierState?: string;
  supplierGstin?: string;
  supplierName?: string;
  initialDefaultNotes?: string;
  initialDefaultTerms?: string;
  initialEstimateNumber?: string;
  initialEstimate?: Estimate;
  salesSettings?: SalesSettings;
  // Backward compatibility aliases
  customers?: CustomerDto[];
  availableProducts?: ProductDto[];
};

export const EstimateCreatePage = ({
  initialCustomers,
  initialProducts,
  supplierState = "27-Maharashtra",
  supplierGstin,
  supplierName,
  initialDefaultNotes,
  initialDefaultTerms,
  initialEstimateNumber,
  initialEstimate,
  salesSettings,
  customers: legacyCustomers,
  availableProducts: legacyProducts,
}: EstimateCreatePageProps) => {
  const router = useRouter();

  const effectiveCustomers = useMemo(
    () => initialCustomers ?? legacyCustomers ?? [],
    [initialCustomers, legacyCustomers],
  );
  const effectiveProducts = useMemo(
    () => initialProducts ?? legacyProducts ?? [],
    [initialProducts, legacyProducts],
  );

  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formattedCustomers: SampleCustomer[] = useMemo(() => {
    return effectiveCustomers.map((c) => ({
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
  }, [effectiveCustomers]);

  const defaultIssueDate = initialEstimate?.issueDate || getTodayDateString();
  const validityDays = salesSettings?.defaultValidityDays || 30;
  const defaultValidUntil =
    initialEstimate?.validUntil ||
    calculateValidUntilDate(defaultIssueDate, validityDays);

  const previewEstimateNumber =
    initialEstimateNumber ||
    (salesSettings
      ? `${salesSettings.estimatePrefix}${String(salesSettings.estimateNextNumber).padStart(salesSettings.estimatePadding, "0")}${salesSettings.estimateSuffix || ""}`
      : "EST-0001");

  const [estimate, setEstimate] = useState<Estimate>(() =>
    initialEstimate ?? {
      id: "",
      estimateNumber: previewEstimateNumber,
      customer: "",
      customerEmail: "",
      customerAddress: "",
      customerGstin: "",
      customerPlaceOfSupply: "",
      referenceNumber: "",
      issueDate: defaultIssueDate,
      validUntil: defaultValidUntil,
      status: "Draft",
      taxMode: "CGST_SGST",
      notes: initialDefaultNotes || salesSettings?.defaultNotes || "",
      terms: initialDefaultTerms || salesSettings?.defaultTerms || "",
      additionalCharges: 0,
      additionalChargesLabel: "",
      additionalDiscount: 0,
      additionalDiscountType: "fixed",
      additionalDiscountLabel: "",
      items: [initialLine("line-1")],
    },
  );

  const totals = calculateEstimateTotals({
    items: estimate.items,
    taxMode: estimate.taxMode,
    additionalCharges: estimate.additionalCharges,
    additionalDiscount: estimate.additionalDiscount,
    additionalDiscountType: estimate.additionalDiscountType,
  });

  const update = (patch: Partial<Estimate>) =>
    setEstimate((current) => ({ ...current, ...patch }));

  const updateLine = (id: string, patch: Partial<EstimateLineItem>) =>
    update({
      items: estimate.items.map((line) =>
        line.id === id ? { ...line, ...patch } : line,
      ),
    });

  const addLine = () => {
    const nextId = `line-${estimate.items.length + 1}-${Date.now().toString().slice(-4)}`;
    update({ items: [...estimate.items, initialLine(nextId)] });
  };

  const removeLine = (id: string) => {
    if (estimate.items.length <= 1) return;
    update({ items: estimate.items.filter((line) => line.id !== id) });
  };

  const handleSelectCustomer = (cust: SampleCustomer | null) => {
    if (!cust) {
      update({
        customerId: undefined,
        customer: "",
        customerEmail: "",
        customerAddress: "",
        customerGstin: "",
        customerPlaceOfSupply: "",
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next.placeOfSupply;
        return next;
      });
    } else {
      const placeOfSupply = cust.placeOfSupply || cust.state || "";

      const taxDecision = determineTaxMode({
        supplierState,
        supplierGstin,
        customerPlaceOfSupply: placeOfSupply,
        customerGstin: cust.gstin,
        customerState: cust.state,
        gstTreatment: cust.gstTreatment,
      });

      update({
        customerId: cust.id,
        customer: cust.name,
        customerEmail: cust.email,
        customerAddress: cust.address,
        customerGstin: cust.gstin,
        customerPlaceOfSupply: placeOfSupply,
        taxMode: taxDecision.taxMode,
      });

      if (taxDecision.error) {
        setErrors((prev) => ({
          ...prev,
          placeOfSupply: taxDecision.error ?? "Unable to determine tax mode.",
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.placeOfSupply;
          return next;
        });
      }

      if (errors.customer || errors.validUntil) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.customer;
          delete next.validUntil;
          return next;
        });
      }
    }
  };

  const executeSubmit = async (targetStatus: EstimateStatus) => {
    const validationErrors: Record<string, string> = {};
    if (!estimate.customer.trim()) {
      validationErrors.customer = "Select a customer before saving.";
    }
    if (!estimate.issueDate) {
      validationErrors.issueDate = "Quotation date is required.";
    }
    if (!estimate.validUntil) {
      validationErrors.validUntil = "Valid until date is required.";
    }

    if (estimate.customer) {
      const taxDecision = determineTaxMode({
        supplierState,
        supplierGstin,
        customerPlaceOfSupply: estimate.customerPlaceOfSupply,
        customerGstin: estimate.customerGstin,
      });
      if (taxDecision.error) {
        validationErrors.placeOfSupply = taxDecision.error;
      }
    }

    const nonEmptyItems = estimate.items.filter(
      (it) => it.item.trim().length > 0 || it.unitPrice > 0,
    );
    const itemsToSave = nonEmptyItems.length > 0 ? nonEmptyItems : estimate.items;

    if (targetStatus !== "Draft") {
      const clientValidation = validateEstimate({
        customer: estimate.customer,
        issueDate: estimate.issueDate,
        validUntil: estimate.validUntil,
        items: itemsToSave,
      });
      Object.assign(validationErrors, clientValidation);
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      setSubmitError(firstError || "Please review the highlighted fields.");
      setPreview(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedCustomer = formattedCustomers.find((c) => c.name === estimate.customer);
      const initialEstimateId = initialEstimate?.id;

      const payload = {
        ...(initialEstimateId ? { id: initialEstimateId } : {}),
        estimateNumber: estimate.estimateNumber || undefined,
        customerId: estimate.customerId || selectedCustomer?.id,
        customerName: estimate.customer,
        customerEmail: estimate.customerEmail || undefined,
        customerAddress: estimate.customerAddress || undefined,
        customerGstin: estimate.customerGstin || undefined,
        customerPlaceOfSupply: estimate.customerPlaceOfSupply || undefined,
        referenceNumber: estimate.referenceNumber || undefined,
        issueDate: estimate.issueDate,
        validUntil: estimate.validUntil,
        status: targetStatus,
        taxMode: estimate.taxMode,
        notes: estimate.notes || undefined,
        terms: estimate.terms || undefined,
        additionalCharges: estimate.additionalCharges,
        additionalChargesLabel: estimate.additionalChargesLabel || undefined,
        additionalDiscount: estimate.additionalDiscount,
        additionalDiscountType: estimate.additionalDiscountType,
        additionalDiscountLabel: estimate.additionalDiscountLabel || undefined,
        items: itemsToSave.map((it) => ({
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

      const result = initialEstimateId
        ? await updateEstimateAction({ ...payload, id: initialEstimateId })
        : await createEstimateAction(payload);

      if (!result.success || !result.data) {
        setSubmitError(result.error || "Failed to save quotation.");
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
        }
        setIsSubmitting(false);
        return;
      }

      router.push(`/estimates/${result.data.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected server error occurred.";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  // Preview Mode
  if (preview) {
    return (
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="link"
            onClick={() => setPreview(false)}
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            <span>Back to edit</span>
          </Button>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => executeSubmit("Draft")}
              className="h-10 px-4 text-sm font-medium"
            >
              <Calendar size={16} className="text-text-muted" />
              <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isSubmitting}
              onClick={() => executeSubmit("Sent")}
              className="h-10 px-4 text-sm font-medium"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? "Sending..." : "Create & Send"}</span>
            </Button>
          </div>
        </div>
        <EstimateDocument estimate={estimate} supplierName={supplierName} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* 1. Back Navigation — strictly above page heading */}
      <div>
        <Link
          href="/estimates"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-light transition-colors hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={16} />
          <span>Back to Estimates</span>
        </Link>
      </div>

      {/* 2. Page Heading & Actions Row */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {initialEstimate ? "Edit Draft Estimate" : "Create Estimate"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create a new quotation with items, taxes, validity, and commercial terms.
          </p>
        </div>

        {/* Action buttons on the right */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => executeSubmit("Draft")}
            className="h-10 px-4 text-sm font-medium"
          >
            <Calendar size={16} className="text-text-muted" />
            <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setPreview(true)}
            className="h-10 px-4 text-sm font-medium"
          >
            <Eye size={16} className="text-text-muted" />
            <span>Preview</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => executeSubmit("Sent")}
            className="h-10 px-4 text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? "Sending..." : "Create & Send"}</span>
          </Button>
        </div>
      </header>

      {submitError && (
        <div
          className="rounded-lg border border-error/40 bg-error/15 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {/* 3. Customer & Proposal Details — Unified customer select, details, and parameters */}
      <EstimateCustomerSection
        selectedCustomer={estimate.customer}
        onSelectCustomer={handleSelectCustomer}
        customers={formattedCustomers}
        error={errors.customer}
        estimateNumber={estimate.estimateNumber}
        onEstimateNumberChange={(val) => update({ estimateNumber: val })}
        issueDate={estimate.issueDate}
        onIssueDateChange={(val) => {
          const newValidUntil = calculateValidUntilDate(val, validityDays);
          update({ issueDate: val, validUntil: newValidUntil });
          if (errors.issueDate || errors.validUntil) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.issueDate;
              delete next.validUntil;
              return next;
            });
          }
        }}
        validUntil={estimate.validUntil}
        onValidUntilChange={(val) => {
          update({ validUntil: val });
          if (errors.validUntil) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.validUntil;
              return next;
            });
          }
        }}
        referenceNumber={estimate.referenceNumber}
        onReferenceNumberChange={(val) => update({ referenceNumber: val })}
        errors={errors}
      />

      {/* 4. Items Section — Full Width */}
      <EstimateItemsSection
        items={estimate.items}
        onUpdateLine={updateLine}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        availableProducts={effectiveProducts}
        errors={errors}
      />

      {/* 5. Charges & Discount (left) and Summary (right) in grid with matching height */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] items-stretch">
        <EstimateAdditionalChargesAndDiscountSection
          additionalCharges={estimate.additionalCharges ?? 0}
          onAdditionalChargesChange={(val) => update({ additionalCharges: val })}
          additionalChargesLabel={estimate.additionalChargesLabel ?? ""}
          onAdditionalChargesLabelChange={(val) =>
            update({ additionalChargesLabel: val })
          }
          additionalDiscount={estimate.additionalDiscount ?? 0}
          onAdditionalDiscountChange={(val) =>
            update({ additionalDiscount: val })
          }
          additionalDiscountType={estimate.additionalDiscountType ?? "fixed"}
          onAdditionalDiscountTypeChange={(val) =>
            update({ additionalDiscountType: val })
          }
          additionalDiscountLabel={estimate.additionalDiscountLabel ?? ""}
          onAdditionalDiscountLabelChange={(val) =>
            update({ additionalDiscountLabel: val })
          }
        />
        <EstimateSummarySection
          totals={totals}
          taxMode={estimate.taxMode}
          onTaxModeChange={(mode) => update({ taxMode: mode })}
          items={estimate.items}
        />
      </div>

      {/* 6. Additional Information Section — Full Width below */}
      <EstimateAdditionalInfoSection
        notes={estimate.notes}
        onNotesChange={(val) => update({ notes: val })}
        terms={estimate.terms}
        onTermsChange={(val) => update({ terms: val })}
      />

      {/* 7. Bottom Submit Error Alert */}
      {submitError && (
        <div
          className="rounded-lg border border-error/40 bg-error/15 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {/* 8. Bottom Action Bar */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
        <Link
          href="/estimates"
          className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
        >
          <X size={15} />
          <span>Cancel</span>
        </Link>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => executeSubmit("Draft")}
            className="w-full sm:w-auto h-10 px-4 text-sm font-medium"
          >
            <Calendar size={16} className="text-text-muted" />
            <span>{isSubmitting ? "Saving..." : "Save as Draft"}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setPreview(true)}
            className="w-full sm:w-auto h-10 px-4 text-sm font-medium"
          >
            <Eye size={16} className="text-text-muted" />
            <span>Preview</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => executeSubmit("Sent")}
            className="w-full sm:w-auto h-10 px-5 text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? "Sending..." : "Create & Send"}</span>
          </Button>
        </div>
      </div>
    </section>
  );
};
