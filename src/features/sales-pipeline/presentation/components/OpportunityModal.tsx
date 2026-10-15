import React, { useState } from "react";
import { X } from "lucide-react";
import { Input, Select, Textarea, Button, Label, FieldError, DatePicker } from "@/shared/components/form";
import type {
  OpportunityStage,
  SalesOpportunity,
} from "../../domain/entities/sales-opportunity";
import { STAGE_DEFAULT_PROBABILITIES } from "../../domain/rules/sales-pipeline-rules";

export type OpportunityFormData = {
  title: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  contactPerson?: string | null;
  description?: string | null;
  source?: string;
  stage?: OpportunityStage;
  estimatedValue: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  assignedTo?: string | null;
  nextFollowUpDate?: string | null;
  nextAction?: string | null;
  lossReason?: string | null;
  notes?: string | null;
};

export interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: OpportunityFormData,
  ) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  initialData?: SalesOpportunity | null;
  customers?: Array<{ id: string; name: string; email?: string | null; phone?: string | null }>;
}

const stageOptions: Array<{ value: OpportunityStage; label: string }> = [
  { value: "NEW_LEAD", label: "New Lead (10%)" },
  { value: "QUALIFIED", label: "Qualified (30%)" },
  { value: "PROPOSAL", label: "Proposal (60%)" },
  { value: "NEGOTIATION", label: "Negotiation (80%)" },
  { value: "WON", label: "Won (100%)" },
  { value: "LOST", label: "Lost (0%)" },
];

// Terminal stages are reachable only through validated transitions, never at
// creation: the create form offers open stages only (server still enforces).
const openStageOptions = stageOptions.filter(
  (o) => o.value !== "WON" && o.value !== "LOST",
);

const sourceOptions = [
  { value: "Website", label: "Website" },
  { value: "Referral", label: "Referral" },
  { value: "Cold Call", label: "Cold Call" },
  { value: "Email Campaign", label: "Email Campaign" },
  { value: "Trade Show", label: "Trade Show" },
  { value: "Partner", label: "Partner" },
  { value: "Other", label: "Other" },
];

const OpportunityModalContent = ({
  onClose,
  onSubmit,
  initialData,
  customers = [],
}: Omit<OpportunityModalProps, "isOpen">) => {
  const isEditing = !!initialData;

  const [title, setTitle] = useState(initialData?.title || "");
  const [customerId, setCustomerId] = useState<string>(initialData?.customerId || "");
  const [customerName, setCustomerName] = useState(initialData?.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(initialData?.customerEmail || "");
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || "");
  const [contactPerson, setContactPerson] = useState(initialData?.contactPerson || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [source, setSource] = useState(initialData?.source || "Website");
  const [stage, setStage] = useState<OpportunityStage>(initialData?.stage || "NEW_LEAD");
  const [estimatedValue, setEstimatedValue] = useState<number>(initialData?.estimatedValue || 0);
  const [probability, setProbability] = useState<number>(initialData?.probability || 10);
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    initialData?.expectedCloseDate
      ? new Date(initialData.expectedCloseDate).toISOString().split("T")[0]
      : "",
  );
  const [assignedTo, setAssignedTo] = useState(initialData?.assignedTo || "");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    initialData?.nextFollowUpDate
      ? new Date(initialData.nextFollowUpDate).toISOString().split("T")[0]
      : "",
  );
  const [nextAction, setNextAction] = useState(initialData?.nextAction || "");
  const [lossReason, setLossReason] = useState(initialData?.lossReason || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleStageChange = (val: string) => {
    const newStage = val as OpportunityStage;
    setStage(newStage);
    setProbability(STAGE_DEFAULT_PROBABILITIES[newStage]);
  };

  const handleCustomerSelect = (custId: string) => {
    setCustomerId(custId);
    const selected = customers.find((c) => c.id === custId);
    if (selected) {
      setCustomerName(selected.name);
      if (selected.email) setCustomerEmail(selected.email);
      if (selected.phone) setCustomerPhone(selected.phone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const payload: OpportunityFormData = {
      title,
      customerId: customerId || null,
      customerName,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      contactPerson: contactPerson || null,
      description: description || null,
      source,
      stage,
      estimatedValue: Number(estimatedValue) || 0,
      currency: "INR (₹)",
      probability: Number(probability) || 0,
      expectedCloseDate: expectedCloseDate || null,
      assignedTo: assignedTo || null,
      nextFollowUpDate: nextFollowUpDate || null,
      nextAction: nextAction || null,
      lossReason: stage === "LOST" ? lossReason : null,
      notes: notes || null,
    };

    const res = await onSubmit(payload);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || "An error occurred.");
      if (res.fieldErrors) {
        setFieldErrors(res.fieldErrors);
      }
    }
  };

  const customerSelectOptions = [
    { value: "", label: "Select existing customer (or enter below)..." },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">
            {isEditing ? "Edit Opportunity" : "New Sales Opportunity"}
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full"
            aria-label="Close"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
          {errorMessage && (
            <div className="mb-4 rounded-lg bg-danger/10 p-3 text-sm text-danger border border-danger/20">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <Label htmlFor="opp-title">Deal / Opportunity Title *</Label>
              <Input
                id="opp-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Enterprise Cloud ERP Implementation"
                className="mt-1 h-10 text-sm"
                required
              />
              <FieldError id="opp-title-err" message={fieldErrors["title"]} />
            </div>

            {/* Existing Customer Dropdown */}
            {customers.length > 0 && (
              <div className="sm:col-span-2">
                <Label htmlFor="opp-cust-select">Select Customer</Label>
                <Select
                  value={customerId}
                  onChange={handleCustomerSelect}
                  options={customerSelectOptions}
                  className="mt-1 h-10 text-sm"
                />
              </div>
            )}

            {/* Customer / Company Name */}
            <div>
              <Label htmlFor="opp-cust-name">Customer / Company Name *</Label>
              <Input
                id="opp-cust-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Company or Lead Name"
                className="mt-1 h-10 text-sm"
                required
              />
              <FieldError id="opp-cust-name-err" message={fieldErrors["customerName"]} />
            </div>

            {/* Contact Person */}
            <div>
              <Label htmlFor="opp-contact">Contact Person</Label>
              <Input
                id="opp-contact"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Key Contact Name"
                className="mt-1 h-10 text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="opp-email">Email Address</Label>
              <Input
                id="opp-email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="contact@company.com"
                className="mt-1 h-10 text-sm"
              />
              <FieldError id="opp-email-err" message={fieldErrors["customerEmail"]} />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="opp-phone">Phone Number</Label>
              <Input
                id="opp-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 h-10 text-sm"
              />
            </div>

            {/* Estimated Value */}
            <div>
              <Label htmlFor="opp-val">Estimated Value (₹) *</Label>
              <Input
                id="opp-val"
                type="number"
                min="0"
                step="0.01"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(Number(e.target.value))}
                className="mt-1 h-10 text-sm"
                required
              />
              <FieldError id="opp-val-err" message={fieldErrors["estimatedValue"]} />
            </div>

            {/* Stage */}
            <div>
              <Label htmlFor="opp-stage">Pipeline Stage *</Label>
              <Select
                value={stage}
                onChange={handleStageChange}
                options={isEditing ? stageOptions : openStageOptions}
                className="mt-1 h-10 text-sm"
              />
            </div>

            {/* Probability % */}
            <div>
              <Label htmlFor="opp-prob">Win Probability (%)</Label>
              <Input
                id="opp-prob"
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="mt-1 h-10 text-sm"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Weighted: ₹{((estimatedValue * probability) / 100).toFixed(2)}
              </p>
            </div>

            {/* Lead Source */}
            <div>
              <Label htmlFor="opp-src">Lead Source</Label>
              <Select
                value={source}
                onChange={setSource}
                options={sourceOptions}
                className="mt-1 h-10 text-sm"
              />
            </div>

            {/* Assigned Owner */}
            <div>
              <Label htmlFor="opp-assigned">Assigned Owner</Label>
              <Input
                id="opp-assigned"
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Sales Rep / Owner"
                className="mt-1 h-10 text-sm"
              />
            </div>

            {/* Expected Close Date */}
            <div>
              <Label htmlFor="opp-close-date">Expected Close Date</Label>
              <div className="mt-1">
                <DatePicker
                  id="opp-close-date"
                  value={expectedCloseDate}
                  onChange={setExpectedCloseDate}
                />
              </div>
            </div>

            {/* Next Follow-Up Date */}
            <div>
              <Label htmlFor="opp-follow-date">Next Follow-Up Date</Label>
              <div className="mt-1">
                <DatePicker
                  id="opp-follow-date"
                  value={nextFollowUpDate}
                  onChange={setNextFollowUpDate}
                />
              </div>
            </div>

            {/* Next Action */}
            <div className="sm:col-span-2">
              <Label htmlFor="opp-action">Next Action / Activity</Label>
              <Input
                id="opp-action"
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="e.g. Send technical architecture proposal"
                className="mt-1 h-10 text-sm"
              />
            </div>

            {/* Loss Reason (MANDATORY IF STAGE === 'LOST') */}
            {stage === "LOST" && (
              <div className="sm:col-span-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
                <Label htmlFor="opp-loss" className="font-semibold text-danger">
                  Loss Reason (Mandatory when marked Lost) *
                </Label>
                <Input
                  id="opp-loss"
                  type="text"
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value)}
                  placeholder="e.g. Budget constraints, Competitor chosen (Vendor X)"
                  className="mt-1 h-10 text-sm"
                  required
                />
                <FieldError id="opp-loss-err" message={fieldErrors["lossReason"]} />
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-2">
              <Label htmlFor="opp-desc">Deal Description / Scope</Label>
              <Textarea
                id="opp-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key requirements and scope..."
                className="mt-1 text-sm"
              />
            </div>

            {/* Internal Notes */}
            <div className="sm:col-span-2">
              <Label htmlFor="opp-notes">Internal Notes</Label>
              <Textarea
                id="opp-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, customer background, deal dynamics..."
                className="mt-1 text-sm"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="h-10 px-5 text-sm font-medium"
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update Opportunity"
                  : "Create Opportunity"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const OpportunityModal = (props: OpportunityModalProps) => {
  if (!props.isOpen) return null;
  return (
    <OpportunityModalContent
      key={props.initialData?.id || "new-opportunity"}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      initialData={props.initialData}
      customers={props.customers}
    />
  );
};
