"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Eye,
  FileText,
  IndianRupee,
  Search,
  Target,
  Users,
  X,
} from "lucide-react";
import type { ChangeEvent } from "react";
import {
  Button,
  DatePicker,
  Input,
  Label,
  Select,
  Textarea,
} from "@/shared/components/form";
import { cn } from "@/shared/utils/cn";
import type {
  OpportunityStage,
  SalesOpportunity,
} from "../../domain/entities/sales-opportunity";
import {
  STAGE_DEFAULT_PROBABILITIES,
  calculateWeightedOpportunityValue,
} from "../../domain/rules/sales-pipeline-rules";
import { createOpportunityAction } from "../../data/mutations/create-opportunity";
import { OpportunityStageBadge } from "../components/OpportunityStageBadge";

export type OpportunityCustomerOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export type OpportunityCreatePageProps = {
  customers?: OpportunityCustomerOption[];
};

const openStageOptions: Array<{ value: OpportunityStage; label: string }> = [
  { value: "NEW_LEAD", label: "New Lead (10%)" },
  { value: "QUALIFIED", label: "Qualified (30%)" },
  { value: "PROPOSAL", label: "Proposal (60%)" },
  { value: "NEGOTIATION", label: "Negotiation (80%)" },
];

const sourceOptions = [
  { value: "Website", label: "Website" },
  { value: "Referral", label: "Referral" },
  { value: "Cold Call", label: "Cold Call" },
  { value: "Email Campaign", label: "Email Campaign" },
  { value: "Trade Show", label: "Trade Show" },
  { value: "Partner", label: "Partner" },
  { value: "Other", label: "Other" },
];

const getTodayDateString = () => new Date().toISOString().split("T")[0];

export const OpportunityCreatePage = ({
  customers = [],
}: OpportunityCreatePageProps) => {
  const router = useRouter();

  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Opportunity fields
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("Website");
  const [stage, setStage] = useState<OpportunityStage>("NEW_LEAD");
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  const [probability, setProbability] = useState<number>(
    STAGE_DEFAULT_PROBABILITIES.NEW_LEAD,
  );
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(getTodayDateString());
  const [nextAction, setNextAction] = useState("");
  const [notes, setNotes] = useState("");

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId],
  );

  const weightedValue = calculateWeightedOpportunityValue(
    Number(estimatedValue) || 0,
    Number(probability) || 0,
  );

  const handleCustomerSelect = (custId: string) => {
    setCustomerId(custId);
    const selected = customers.find((c) => c.id === custId);
    if (selected) {
      setCustomerName(selected.name);
      if (selected.email) setCustomerEmail(selected.email);
      if (selected.phone) setCustomerPhone(selected.phone);
    }
    if (errors.customer) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.customer;
        return next;
      });
    }
  };

  const handleStageChange = (val: string) => {
    const newStage = val as OpportunityStage;
    setStage(newStage);
    setProbability(STAGE_DEFAULT_PROBABILITIES[newStage]);
  };

  const handleSave = async () => {
    setSubmitError(null);
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Opportunity title is required.";
    }
    if (!customerName.trim()) {
      newErrors.customer = "Select a customer or enter a customer name.";
    }
    const value = Number(estimatedValue) || 0;
    if (value < 0) {
      newErrors.estimatedValue = "Estimated value cannot be negative.";
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
      const res = await createOpportunityAction({
        title: title.trim(),
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        customerPhone: customerPhone.trim() || null,
        contactPerson: contactPerson.trim() || null,
        description: description.trim() || null,
        source,
        stage,
        estimatedValue: value,
        currency: "INR (₹)",
        probability: Number(probability) || 0,
        expectedCloseDate: expectedCloseDate || null,
        assignedTo: assignedTo.trim() || null,
        nextFollowUpDate: nextFollowUpDate || null,
        nextAction: nextAction.trim() || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        throw new Error(res.error || "Failed to create opportunity.");
      }
      if (!res.data) {
        throw new Error("Failed to create opportunity.");
      }
      const created = res.data as SalesOpportunity;
      router.push(`/sales-pipeline/${created.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save opportunity.";
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
          href="/sales-pipeline"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Sales Pipeline
        </Link>
      </div>

      {/* 2. Page Header & Actions matching SalesOrderCreatePage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              New Sales Opportunity
            </h1>
            <OpportunityStageBadge stage={stage} />
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Capture a new deal with customer details, forecast value, probability,
            and follow-up schedule.
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
            <span>{preview ? "Hide Preview" : "Preview Opportunity"}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSubmitting}
            className="h-10 px-4 text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? "Saving..." : "Create Opportunity"}</span>
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

      {/* 4. Live Summary Preview Toggle */}
      {preview ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-4">
            <span className="text-sm font-medium text-text-primary">
              Showing live preview of this sales opportunity.
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

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                {title.trim() || "Untitled Opportunity"}
              </h2>
              <OpportunityStageBadge stage={stage} />
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {customerName.trim() || "No customer yet"}
              {contactPerson.trim() ? ` • ${contactPerson.trim()}` : ""}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl border border-border/60 bg-surface-alt/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-text-muted">
                  Estimated Value
                </p>
                <p className="mt-1 font-mono text-base font-bold text-text-primary">
                  ₹{(Number(estimatedValue) || 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-alt/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-text-muted">
                  Win Probability
                </p>
                <p className="mt-1 font-mono text-base font-bold text-text-primary">
                  {Number(probability) || 0}%
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-surface-alt/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-text-muted">
                  Weighted Forecast
                </p>
                <p className="mt-1 font-mono text-base font-bold text-text-primary">
                  ₹{weightedValue.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
              <span>
                Follow-up:{" "}
                {nextFollowUpDate ? (
                  <span className="font-semibold text-text-primary">
                    {nextFollowUpDate}
                  </span>
                ) : (
                  "None scheduled"
                )}
              </span>
              <span>
                Expected close:{" "}
                {expectedCloseDate ? (
                  <span className="font-semibold text-text-primary">
                    {expectedCloseDate}
                  </span>
                ) : (
                  "Not set"
                )}
              </span>
              {nextAction.trim() && (
                <span>
                  Next action:{" "}
                  <span className="font-semibold text-text-primary">
                    {nextAction.trim()}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Opportunity & Customer Details */}
          <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-6">
            {/* 1. Section Header */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
                aria-hidden="true"
              >
                <Target size={19} />
              </div>
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
                  Opportunity &amp; Customer Details
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Select a customer and specify deal title, stage, source, and ownership.
                </p>
              </div>
            </div>

            {/* 2. Customer Selector + Snapshot */}
            <div className="space-y-4">
              <div className="w-full max-w-2xl">
                <div className="mb-1.5 flex items-center justify-between">
                  <Label
                    htmlFor="opp-customer-select"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Customer
                  </Label>
                  <Link
                    href="/customers/new"
                    target="_blank"
                    className="text-xs font-semibold text-primary-light hover:text-primary transition-colors"
                  >
                    + Add Customer
                  </Link>
                </div>

                <div className="relative">
                  <Select
                    id="opp-customer-select"
                    value={customerId}
                    onChange={handleCustomerSelect}
                    options={[
                      { value: "", label: "Search or select a customer..." },
                      ...customers.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    className={cn(errors.customer && "border-danger focus:border-danger")}
                  />
                  <Search
                    size={14}
                    className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-text-muted"
                    aria-hidden="true"
                  />
                </div>
                {errors.customer && (
                  <p className="mt-1 text-xs text-danger">{errors.customer}</p>
                )}
              </div>

              {/* Selected Customer Snapshot Card */}
              {selectedCustomer ? (
                <div className="rounded-xl border border-border/80 bg-surface-alt/40 p-4 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <span className="font-semibold text-text-primary text-sm sm:text-base">
                      {selectedCustomer.name}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      {selectedCustomer.email ? (
                        <span className="rounded bg-surface-card px-2 py-0.5 text-[11px] font-medium text-text-secondary border border-border/60">
                          {selectedCustomer.email}
                        </span>
                      ) : (
                        <span className="text-text-muted text-[11px]">No email</span>
                      )}
                      {selectedCustomer.phone && (
                        <span className="rounded bg-surface-card px-2 py-0.5 text-[11px] font-medium text-text-secondary border border-border/60">
                          {selectedCustomer.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    Selecting a customer pre-fills contact details below. You can
                    still edit every field.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-surface-alt/20 p-4 text-center">
                  <Users size={20} className="mx-auto text-text-muted mb-1" />
                  <p className="text-xs text-text-secondary">
                    No customer selected yet. Choose a customer above or enter the
                    details manually below.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Parameter Fields */}
            <div className="border-t border-border/80 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <Label
                    htmlFor="opp-title"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Opportunity Title <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-title"
                      type="text"
                      value={title}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setTitle(e.target.value)
                      }
                      placeholder="e.g. Enterprise Cloud ERP Implementation"
                      className={cn("h-10 text-sm", errors.title && "border-danger focus:border-danger")}
                    />
                    {errors.title && (
                      <p className="mt-1 text-xs text-danger">{errors.title}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-stage"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Pipeline Stage <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-1.5">
                    <Select
                      id="opp-stage"
                      value={stage}
                      onChange={handleStageChange}
                      options={openStageOptions}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-source"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Lead Source
                  </Label>
                  <div className="mt-1.5">
                    <Select
                      id="opp-source"
                      value={source}
                      onChange={setSource}
                      options={sourceOptions}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-customer-name"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Customer / Company <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCustomerName(e.target.value)
                      }
                      placeholder="Company or Lead Name"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-contact"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Contact Person
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-contact"
                      type="text"
                      value={contactPerson}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setContactPerson(e.target.value)
                      }
                      placeholder="Key Contact Name"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-email"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Email Address
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-email"
                      type="email"
                      value={customerEmail}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCustomerEmail(e.target.value)
                      }
                      placeholder="contact@company.com"
                      className="h-10 text-sm"
                    />
                    {errors.customerEmail && (
                      <p className="mt-1 text-xs text-danger">
                        {errors.customerEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-phone"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Phone Number
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCustomerPhone(e.target.value)
                      }
                      placeholder="+91 98765 43210"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-assigned"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Assigned Owner
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-assigned"
                      type="text"
                      value={assignedTo}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setAssignedTo(e.target.value)
                      }
                      placeholder="Sales Rep / Owner"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Side-by-Side Commercials & Forecast Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.5fr_1fr] 2xl:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
            <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
                  aria-hidden="true"
                >
                  <IndianRupee size={19} />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
                    Deal Commercials &amp; Schedule
                  </h2>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Forecast value, win probability, and follow-up plan.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="opp-value"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Estimated Value (₹) <span className="text-danger">*</span>
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={estimatedValue}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setEstimatedValue(Number(e.target.value))
                      }
                      placeholder="0"
                      className={cn(
                        "h-10 text-sm tabular-nums",
                        errors.estimatedValue && "border-danger focus:border-danger",
                      )}
                    />
                    {errors.estimatedValue && (
                      <p className="mt-1 text-xs text-danger">
                        {errors.estimatedValue}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-probability"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Win Probability (%)
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-probability"
                      type="number"
                      min="0"
                      max="100"
                      value={probability}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setProbability(Number(e.target.value))
                      }
                      className="h-10 text-sm tabular-nums"
                    />
                    <p className="mt-1 text-[11px] text-text-muted">
                      Auto-set from stage; adjustable per deal.
                    </p>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-expected-close"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Expected Close Date
                  </Label>
                  <div className="mt-1.5">
                    <DatePicker
                      id="opp-expected-close"
                      value={expectedCloseDate}
                      onChange={setExpectedCloseDate}
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="opp-follow-up"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Next Follow-Up Date
                  </Label>
                  <div className="mt-1.5">
                    <DatePicker
                      id="opp-follow-up"
                      value={nextFollowUpDate}
                      onChange={setNextFollowUpDate}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label
                    htmlFor="opp-next-action"
                    className="text-xs font-semibold tracking-wide uppercase text-text-secondary"
                  >
                    Next Action / Activity
                  </Label>
                  <div className="mt-1.5">
                    <Input
                      id="opp-next-action"
                      type="text"
                      value={nextAction}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNextAction(e.target.value)
                      }
                      placeholder="e.g. Send technical architecture proposal"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface-card p-5 sm:p-6 transition-colors">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-alt/70 text-primary-light"
                    aria-hidden="true"
                  >
                    <Calculator size={19} />
                  </div>
                  <div>
                    <h2 className="font-heading text-lg font-semibold tracking-tight text-text-primary">
                      Forecast Summary
                    </h2>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Review deal value and win forecast.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Estimated Value</span>
                    <span className="font-mono text-text-primary">
                      ₹{(Number(estimatedValue) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span>Win Probability</span>
                    <span className="font-mono text-text-primary">
                      {Number(probability) || 0}%
                    </span>
                  </div>
                  <div className="border-t border-border/80 pt-2 flex justify-between font-medium text-text-primary">
                    <span>Stage</span>
                    <span>
                      <OpportunityStageBadge stage={stage} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-border/80 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-text-primary">
                    Weighted Forecast:
                  </span>
                  <span className="text-2xl font-bold font-mono text-text-primary">
                    ₹{weightedValue.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  Currency: INR (₹) • Probability-adjusted expected revenue
                </p>
              </div>
            </section>
          </div>

          {/* Section 3: Notes & Description */}
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
                  Deal Scope &amp; Internal Notes
                </h2>
                <p className="mt-0.5 text-xs text-text-secondary">
                  Capture requirements, background, and deal dynamics.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="opp-description"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Deal Description / Scope
                </Label>
                <Textarea
                  id="opp-description"
                  rows={4}
                  value={description}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Key requirements and scope..."
                  className="min-h-24 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <Label
                  htmlFor="opp-notes"
                  className="mb-1.5 block text-xs font-medium text-text-secondary"
                >
                  Internal Notes
                </Label>
                <Textarea
                  id="opp-notes"
                  rows={4}
                  value={notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(e.target.value)
                  }
                  placeholder="Internal notes, customer background, deal dynamics..."
                  className="min-h-24 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Bottom Action Bar */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border/80 pt-6">
            <Link
              href="/sales-pipeline"
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
                disabled={isSubmitting}
                className="w-full sm:w-auto h-10 px-5 text-sm font-medium"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? "Saving..." : "Create Opportunity"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
