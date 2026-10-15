"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  Hash,
  Info,
  Loader2,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Truck,
  Undo2,
  X,
} from "lucide-react";
import { Input, Label, Textarea, Select, Button } from "@/shared/components/form";
import { Tabs, type TabItem } from "@/shared/components/Tabs";
import type { SalesSettings } from "../../domain/entities/sales-settings";
import {
  DEFAULT_SALES_SETTINGS,
  formatEstimateNumber,
  formatSalesOrderNumber,
  formatDeliveryChallanNumber,
  formatSalesReturnNumber,
} from "../../domain/rules/sales-settings-rules";
import { saveSalesSettingsAction } from "../../data/mutations/save-sales-settings";

type SalesSettingsTabId = "estimates" | "sales-orders" | "delivery-challans" | "sales-returns";

const salesSettingsTabs: readonly TabItem[] = [
  {
    id: "estimates",
    label: "Estimates & Quotations",
    icon: <FileText size={16} />,
  },
  {
    id: "sales-orders",
    label: "Sales Orders",
    icon: <ShoppingCart size={16} />,
  },
  {
    id: "delivery-challans",
    label: "Delivery Challans",
    icon: <Truck size={16} />,
  },
  {
    id: "sales-returns",
    label: "Sales Returns",
    icon: <Undo2 size={16} />,
  },
];

export type SalesSettingsPageProps = {
  initialSettings: SalesSettings;
};

const paddingOptions = [
  { value: "3", label: "3 digits (e.g. 001)" },
  { value: "4", label: "4 digits (e.g. 0001 - Standard)" },
  { value: "5", label: "5 digits (e.g. 00001)" },
  { value: "6", label: "6 digits (e.g. 000001)" },
  { value: "8", label: "8 digits (e.g. 00000001)" },
];

export const SalesSettingsPage = ({ initialSettings }: SalesSettingsPageProps) => {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<SalesSettingsTabId>("estimates");

  // Estimate Form states
  const [prefix, setPrefix] = useState(initialSettings.estimatePrefix);
  const [suffix, setSuffix] = useState(initialSettings.estimateSuffix || "");
  const [nextNumber, setNextNumber] = useState<string>(String(initialSettings.estimateNextNumber));
  const [padding, setPadding] = useState<string>(String(initialSettings.estimatePadding));
  const [validityDays, setValidityDays] = useState<string>(String(initialSettings.defaultValidityDays));
  const [defaultNotes, setDefaultNotes] = useState(initialSettings.defaultNotes || "");
  const [defaultTerms, setDefaultTerms] = useState(initialSettings.defaultTerms || "");

  // Sales Order Form states
  const [soPrefix, setSoPrefix] = useState(initialSettings.salesOrderPrefix || "SO-");
  const [soSuffix, setSoSuffix] = useState(initialSettings.salesOrderSuffix || "");
  const [soNextNumber, setSoNextNumber] = useState<string>(
    String(initialSettings.salesOrderNextNumber || 1),
  );
  const [soPadding, setSoPadding] = useState<string>(
    String(initialSettings.salesOrderPadding || 4),
  );
  const [deliveryDays, setDeliveryDays] = useState<string>(
    String(initialSettings.defaultDeliveryDays || 15),
  );
  const [defaultSoNotes, setDefaultSoNotes] = useState(
    initialSettings.defaultSalesOrderNotes || "",
  );
  const [defaultSoTerms, setDefaultSoTerms] = useState(
    initialSettings.defaultSalesOrderTerms || "",
  );

  // Delivery Challan Form states
  const [dcPrefix, setDcPrefix] = useState(initialSettings.deliveryChallanPrefix || "DC-");
  const [dcSuffix, setDcSuffix] = useState(initialSettings.deliveryChallanSuffix || "");
  const [dcNextNumber, setDcNextNumber] = useState<string>(
    String(initialSettings.deliveryChallanNextNumber || 1),
  );
  const [dcPadding, setDcPadding] = useState<string>(
    String(initialSettings.deliveryChallanPadding || 4),
  );
  const [defaultDcInstructions, setDefaultDcInstructions] = useState(
    initialSettings.defaultDeliveryInstructions || "",
  );
  const [defaultDcTerms, setDefaultDcTerms] = useState(
    initialSettings.defaultDeliveryTerms || "",
  );

  // Sales Return Form states
  const [srPrefix, setSrPrefix] = useState(initialSettings.salesReturnPrefix || "SR-");
  const [srSuffix, setSrSuffix] = useState(initialSettings.salesReturnSuffix || "");
  const [srNextNumber, setSrNextNumber] = useState<string>(
    String(initialSettings.salesReturnNextNumber || 1),
  );
  const [srPadding, setSrPadding] = useState<string>(
    String(initialSettings.salesReturnPadding || 4),
  );
  const [defaultSrReason, setDefaultSrReason] = useState(
    initialSettings.defaultReturnReason || "",
  );
  const [defaultSrPolicy, setDefaultSrPolicy] = useState(
    initialSettings.defaultReturnPolicy || "",
  );

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Estimate Preview
  const numVal = parseInt(nextNumber, 10);
  const paddingVal = parseInt(padding, 10) || 4;
  let previewEstimateNumber = "EST-0001";
  try {
    previewEstimateNumber = formatEstimateNumber({
      prefix,
      nextNumber: isNaN(numVal) ? 1 : Math.max(1, numVal),
      padding: paddingVal,
      suffix,
    });
  } catch {
    previewEstimateNumber = "Invalid format";
  }

  // Sales Order Preview
  const soNumVal = parseInt(soNextNumber, 10);
  const soPaddingVal = parseInt(soPadding, 10) || 4;
  let previewSoNumber = "SO-0001";
  try {
    previewSoNumber = formatSalesOrderNumber({
      prefix: soPrefix,
      nextNumber: isNaN(soNumVal) ? 1 : Math.max(1, soNumVal),
      padding: soPaddingVal,
      suffix: soSuffix,
    });
  } catch {
    previewSoNumber = "Invalid format";
  }

  // Delivery Challan Preview
  const dcNumVal = parseInt(dcNextNumber, 10);
  const dcPaddingVal = parseInt(dcPadding, 10) || 4;
  let previewDcNumber = "DC-0001";
  try {
    previewDcNumber = formatDeliveryChallanNumber({
      prefix: dcPrefix,
      nextNumber: isNaN(dcNumVal) ? 1 : Math.max(1, dcNumVal),
      padding: dcPaddingVal,
      suffix: dcSuffix,
    });
  } catch {
    previewDcNumber = "Invalid format";
  }

  // Sales Return Preview
  const srNumVal = parseInt(srNextNumber, 10);
  const srPaddingVal = parseInt(srPadding, 10) || 4;
  let previewSrNumber = "SR-0001";
  try {
    previewSrNumber = formatSalesReturnNumber({
      prefix: srPrefix,
      nextNumber: isNaN(srNumVal) ? 1 : Math.max(1, srNumVal),
      padding: srPaddingVal,
      suffix: srSuffix,
    });
  } catch {
    previewSrNumber = "Invalid format";
  }

  const handleResetToDefaults = () => {
    if (activeTab === "estimates") {
      setPrefix(DEFAULT_SALES_SETTINGS.estimatePrefix);
      setSuffix(DEFAULT_SALES_SETTINGS.estimateSuffix || "");
      setNextNumber(String(DEFAULT_SALES_SETTINGS.estimateNextNumber));
      setPadding(String(DEFAULT_SALES_SETTINGS.estimatePadding));
      setValidityDays(String(DEFAULT_SALES_SETTINGS.defaultValidityDays));
      setDefaultNotes(DEFAULT_SALES_SETTINGS.defaultNotes || "");
      setDefaultTerms(DEFAULT_SALES_SETTINGS.defaultTerms || "");
    } else if (activeTab === "sales-orders") {
      setSoPrefix(DEFAULT_SALES_SETTINGS.salesOrderPrefix);
      setSoSuffix(DEFAULT_SALES_SETTINGS.salesOrderSuffix || "");
      setSoNextNumber(String(DEFAULT_SALES_SETTINGS.salesOrderNextNumber));
      setSoPadding(String(DEFAULT_SALES_SETTINGS.salesOrderPadding));
      setDeliveryDays(String(DEFAULT_SALES_SETTINGS.defaultDeliveryDays));
      setDefaultSoNotes(DEFAULT_SALES_SETTINGS.defaultSalesOrderNotes || "");
      setDefaultSoTerms(DEFAULT_SALES_SETTINGS.defaultSalesOrderTerms || "");
    } else if (activeTab === "delivery-challans") {
      setDcPrefix(DEFAULT_SALES_SETTINGS.deliveryChallanPrefix);
      setDcSuffix(DEFAULT_SALES_SETTINGS.deliveryChallanSuffix || "");
      setDcNextNumber(String(DEFAULT_SALES_SETTINGS.deliveryChallanNextNumber));
      setDcPadding(String(DEFAULT_SALES_SETTINGS.deliveryChallanPadding));
      setDefaultDcInstructions(DEFAULT_SALES_SETTINGS.defaultDeliveryInstructions || "");
      setDefaultDcTerms(DEFAULT_SALES_SETTINGS.defaultDeliveryTerms || "");
    } else if (activeTab === "sales-returns") {
      setSrPrefix(DEFAULT_SALES_SETTINGS.salesReturnPrefix);
      setSrSuffix(DEFAULT_SALES_SETTINGS.salesReturnSuffix || "");
      setSrNextNumber(String(DEFAULT_SALES_SETTINGS.salesReturnNextNumber));
      setSrPadding(String(DEFAULT_SALES_SETTINGS.salesReturnPadding));
      setDefaultSrReason(DEFAULT_SALES_SETTINGS.defaultReturnReason || "");
      setDefaultSrPolicy(DEFAULT_SALES_SETTINGS.defaultReturnPolicy || "");
    }
    setFieldErrors({});
    setFormError(null);
    setSuccessMessage("Values populated with defaults. Click 'Save Settings' to apply.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setFormError(null);
    setFieldErrors({});

    const numericNextNumber = parseInt(nextNumber, 10);
    if (isNaN(numericNextNumber) || numericNextNumber < 1) {
      setFieldErrors({
        estimateNextNumber: "Sequence number must be a positive integer greater than or equal to 1.",
      });
      return;
    }

    const numericValidityDays = parseInt(validityDays, 10);
    if (isNaN(numericValidityDays) || numericValidityDays < 1 || numericValidityDays > 365) {
      setFieldErrors({
        defaultValidityDays: "Validity period must be between 1 and 365 days.",
      });
      return;
    }

    const numericSoNextNumber = parseInt(soNextNumber, 10);
    if (isNaN(numericSoNextNumber) || numericSoNextNumber < 1) {
      setFieldErrors({
        salesOrderNextNumber: "Sequence number must be a positive integer greater than or equal to 1.",
      });
      return;
    }

    const numericDeliveryDays = parseInt(deliveryDays, 10);
    if (isNaN(numericDeliveryDays) || numericDeliveryDays < 1 || numericDeliveryDays > 365) {
      setFieldErrors({
        defaultDeliveryDays: "Delivery period must be between 1 and 365 days.",
      });
      return;
    }

    const numericDcNextNumber = parseInt(dcNextNumber, 10);
    if (isNaN(numericDcNextNumber) || numericDcNextNumber < 1) {
      setFieldErrors({
        deliveryChallanNextNumber: "Sequence number must be a positive integer greater than or equal to 1.",
      });
      return;
    }

    const numericSrNextNumber = parseInt(srNextNumber, 10);
    if (isNaN(numericSrNextNumber) || numericSrNextNumber < 1) {
      setFieldErrors({
        salesReturnNextNumber: "Sequence number must be a positive integer greater than or equal to 1.",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveSalesSettingsAction({
        estimatePrefix: prefix.trim(),
        estimateSuffix: suffix.trim() || null,
        estimateNextNumber: numericNextNumber,
        estimatePadding: paddingVal,
        salesOrderPrefix: soPrefix.trim(),
        salesOrderSuffix: soSuffix.trim() || null,
        salesOrderNextNumber: numericSoNextNumber,
        salesOrderPadding: soPaddingVal,
        deliveryChallanPrefix: dcPrefix.trim(),
        deliveryChallanSuffix: dcSuffix.trim() || null,
        deliveryChallanNextNumber: numericDcNextNumber,
        deliveryChallanPadding: dcPaddingVal,
        salesReturnPrefix: srPrefix.trim(),
        salesReturnSuffix: srSuffix.trim() || null,
        salesReturnNextNumber: numericSrNextNumber,
        salesReturnPadding: srPaddingVal,
        defaultValidityDays: numericValidityDays,
        defaultDeliveryDays: numericDeliveryDays,
        defaultNotes: defaultNotes.trim() || null,
        defaultTerms: defaultTerms.trim() || null,
        defaultSalesOrderNotes: defaultSoNotes.trim() || null,
        defaultSalesOrderTerms: defaultSoTerms.trim() || null,
        defaultDeliveryInstructions: defaultDcInstructions.trim() || null,
        defaultDeliveryTerms: defaultDcTerms.trim() || null,
        defaultReturnReason: defaultSrReason.trim() || null,
        defaultReturnPolicy: defaultSrPolicy.trim() || null,
      });

      if (!result.success) {
        setFormError(result.error || "Failed to save sales settings.");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      setSuccessMessage("Sales settings saved successfully.");
      if (result.data) {
        setNextNumber(String(result.data.estimateNextNumber));
        setSoNextNumber(String(result.data.salesOrderNextNumber));
        setDcNextNumber(String(result.data.deliveryChallanNextNumber));
        setSrNextNumber(String(result.data.salesReturnNextNumber));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Sales Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Configure document numbering, default validity/delivery windows, delivery terms, and return policies for sales operations.
        </p>
      </div>

      {/* Horizontal Tabs using shared Tabs component */}
      <Tabs
        tabs={salesSettingsTabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as SalesSettingsTabId)}
        ariaLabel="Sales Document Settings"
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Success Notification */}
        {successMessage && (
          <div
            className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success flex items-center justify-between"
            role="status"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
            <Button
              type="button"
              variant="link"
              onClick={() => setSuccessMessage(null)}
              className="h-auto p-1 text-success hover:text-success/80"
              aria-label="Dismiss success message"
            >
              <X size={16} />
            </Button>
          </div>
        )}

        {/* Error Notification */}
        {formError && (
          <div
            className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger flex items-center justify-between"
            role="alert"
          >
            <span>{formError}</span>
            <Button
              type="button"
              variant="link"
              onClick={() => setFormError(null)}
              className="h-auto p-1 text-danger hover:text-danger/80"
              aria-label="Dismiss error message"
            >
              <X size={16} />
            </Button>
          </div>
        )}

        {/* Info Banner */}
        <div className="rounded-xl border border-border/80 bg-surface-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-primary-light mt-0.5">
              <Info size={15} />
            </div>
            <div className="text-xs sm:text-sm">
              <h3 className="font-semibold text-text-primary">
                Independent Numbering &amp; Multi-Tenant Isolation
              </h3>
              <p className="mt-0.5 text-text-secondary leading-relaxed">
                Quotations, sales orders, delivery challans, and sales returns each maintain their own independent, gapless sequence counters. Numbers are allocated safely with row-level database locking.
              </p>
            </div>
          </div>
        </div>

        {activeTab === "estimates" && (
          <div className="space-y-6">
            {/* Estimate Numbering Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Hash size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Quotation Numbering Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="estimatePrefix">Prefix *</Label>
                  <Input
                    id="estimatePrefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="EST-"
                    className="mt-1.5"
                  />
                  {fieldErrors.estimatePrefix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.estimatePrefix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. EST-, QT-, QUOT/</p>
                </div>

                <div>
                  <Label htmlFor="estimateSuffix">Suffix (Optional)</Label>
                  <Input
                    id="estimateSuffix"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="/2026"
                    className="mt-1.5"
                  />
                  {fieldErrors.estimateSuffix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.estimateSuffix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. /2026, /FY26</p>
                </div>

                <div>
                  <Label htmlFor="estimateNextNumber">Next Sequence Number *</Label>
                  <Input
                    id="estimateNextNumber"
                    type="number"
                    min="1"
                    max="999999999"
                    value={nextNumber}
                    onChange={(e) => setNextNumber(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.estimateNextNumber && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.estimateNextNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">Counter increments automatically on save.</p>
                </div>

                <div>
                  <Label htmlFor="estimatePadding">Minimum Digits Padding *</Label>
                  <Select
                    id="estimatePadding"
                    value={padding}
                    onChange={(val) => setPadding(val)}
                    options={paddingOptions}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-light" />
                  <span className="text-xs sm:text-sm font-medium text-text-secondary">
                    Next Generated Quotation Number Preview:
                  </span>
                </div>
                <span className="font-mono text-sm sm:text-base font-bold text-text-primary bg-surface-card px-3 py-1.5 rounded border border-border">
                  {previewEstimateNumber}
                </span>
              </div>
            </div>

            {/* Estimate Defaults Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Clock size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Quotation Defaults &amp; Validity
                </h2>
              </div>

              <div>
                <Label htmlFor="defaultValidityDays">Default Validity Period (Days) *</Label>
                <Input
                  id="defaultValidityDays"
                  type="number"
                  min="1"
                  max="365"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="mt-1.5 max-w-xs"
                />
                {fieldErrors.defaultValidityDays && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.defaultValidityDays}</p>
                )}
                <p className="mt-1 text-xs text-text-muted">
                  Used to automatically compute expiration dates on new estimates.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
                <div>
                  <Label htmlFor="defaultNotes">Default Customer Notes</Label>
                  <Textarea
                    id="defaultNotes"
                    rows={4}
                    value={defaultNotes}
                    onChange={(e) => setDefaultNotes(e.target.value)}
                    placeholder="Enter default notes prefilled on new quotations..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultNotes && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultNotes}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="defaultTerms">Default Terms &amp; Conditions</Label>
                  <Textarea
                    id="defaultTerms"
                    rows={4}
                    value={defaultTerms}
                    onChange={(e) => setDefaultTerms(e.target.value)}
                    placeholder="Enter default terms and conditions..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultTerms && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultTerms}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sales-orders" && (
          <div className="space-y-6">
            {/* Sales Order Numbering Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Hash size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Sales Order Numbering Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="soPrefix">Prefix *</Label>
                  <Input
                    id="soPrefix"
                    value={soPrefix}
                    onChange={(e) => setSoPrefix(e.target.value)}
                    placeholder="SO-"
                    className="mt-1.5"
                  />
                  {fieldErrors.salesOrderPrefix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.salesOrderPrefix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. SO-, ORD-, SO/</p>
                </div>

                <div>
                  <Label htmlFor="soSuffix">Suffix (Optional)</Label>
                  <Input
                    id="soSuffix"
                    value={soSuffix}
                    onChange={(e) => setSoSuffix(e.target.value)}
                    placeholder="/2026"
                    className="mt-1.5"
                  />
                  {fieldErrors.salesOrderSuffix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.salesOrderSuffix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. /2026, /FY26</p>
                </div>

                <div>
                  <Label htmlFor="soNextNumber">Next Sequence Number *</Label>
                  <Input
                    id="soNextNumber"
                    type="number"
                    min="1"
                    max="999999999"
                    value={soNextNumber}
                    onChange={(e) => setSoNextNumber(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.salesOrderNextNumber && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.salesOrderNextNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">Counter increments automatically when an order is created.</p>
                </div>

                <div>
                  <Label htmlFor="soPadding">Minimum Digits Padding *</Label>
                  <Select
                    id="soPadding"
                    value={soPadding}
                    onChange={(val) => setSoPadding(val)}
                    options={paddingOptions}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-light" />
                  <span className="text-xs sm:text-sm font-medium text-text-secondary">
                    Next Generated Sales Order Number Preview:
                  </span>
                </div>
                <span className="font-mono text-sm sm:text-base font-bold text-text-primary bg-surface-card px-3 py-1.5 rounded border border-border">
                  {previewSoNumber}
                </span>
              </div>
            </div>

            {/* Sales Order Defaults Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Truck size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Sales Order Defaults &amp; Delivery Window
                </h2>
              </div>

              <div>
                <Label htmlFor="defaultDeliveryDays">Default Delivery Window (Days) *</Label>
                <Input
                  id="defaultDeliveryDays"
                  type="number"
                  min="1"
                  max="365"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  className="mt-1.5 max-w-xs"
                />
                {fieldErrors.defaultDeliveryDays && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.defaultDeliveryDays}</p>
                )}
                <p className="mt-1 text-xs text-text-muted">
                  Used to automatically compute expected delivery dates on new sales orders.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
                <div>
                  <Label htmlFor="defaultSoNotes">Default Customer Notes</Label>
                  <Textarea
                    id="defaultSoNotes"
                    rows={4}
                    value={defaultSoNotes}
                    onChange={(e) => setDefaultSoNotes(e.target.value)}
                    placeholder="Enter default notes prefilled on new sales orders..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultSalesOrderNotes && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultSalesOrderNotes}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="defaultSoTerms">Default Commercial Terms &amp; Conditions</Label>
                  <Textarea
                    id="defaultSoTerms"
                    rows={4}
                    value={defaultSoTerms}
                    onChange={(e) => setDefaultSoTerms(e.target.value)}
                    placeholder="Enter default delivery and commercial terms..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultSalesOrderTerms && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultSalesOrderTerms}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "delivery-challans" && (
          <div className="space-y-6">
            {/* Delivery Challan Numbering Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Hash size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Delivery Challan Numbering Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="dcPrefix">Prefix *</Label>
                  <Input
                    id="dcPrefix"
                    value={dcPrefix}
                    onChange={(e) => setDcPrefix(e.target.value)}
                    placeholder="DC-"
                    className="mt-1.5"
                  />
                  {fieldErrors.deliveryChallanPrefix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.deliveryChallanPrefix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. DC-, CHN-, DC/</p>
                </div>

                <div>
                  <Label htmlFor="dcSuffix">Suffix (Optional)</Label>
                  <Input
                    id="dcSuffix"
                    value={dcSuffix}
                    onChange={(e) => setDcSuffix(e.target.value)}
                    placeholder="/2026"
                    className="mt-1.5"
                  />
                  {fieldErrors.deliveryChallanSuffix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.deliveryChallanSuffix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. /2026, /FY26</p>
                </div>

                <div>
                  <Label htmlFor="dcNextNumber">Next Sequence Number *</Label>
                  <Input
                    id="dcNextNumber"
                    type="number"
                    min="1"
                    max="999999999"
                    value={dcNextNumber}
                    onChange={(e) => setDcNextNumber(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.deliveryChallanNextNumber && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.deliveryChallanNextNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">Counter increments automatically when a delivery challan is created.</p>
                </div>

                <div>
                  <Label htmlFor="dcPadding">Minimum Digits Padding *</Label>
                  <Select
                    id="dcPadding"
                    value={dcPadding}
                    onChange={(val) => setDcPadding(val)}
                    options={paddingOptions}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-light" />
                  <span className="text-xs sm:text-sm font-medium text-text-secondary">
                    Next Generated Delivery Challan Number Preview:
                  </span>
                </div>
                <span className="font-mono text-sm sm:text-base font-bold text-text-primary bg-surface-card px-3 py-1.5 rounded border border-border">
                  {previewDcNumber}
                </span>
              </div>
            </div>

            {/* Delivery Challan Defaults Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Truck size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Delivery Challan Defaults &amp; Instructions
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="defaultDcInstructions">Default Delivery Instructions</Label>
                  <Textarea
                    id="defaultDcInstructions"
                    rows={4}
                    value={defaultDcInstructions}
                    onChange={(e) => setDefaultDcInstructions(e.target.value)}
                    placeholder="Enter default dispatch and delivery instructions..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultDeliveryInstructions && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultDeliveryInstructions}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="defaultDcTerms">Default Delivery Terms &amp; Conditions</Label>
                  <Textarea
                    id="defaultDcTerms"
                    rows={4}
                    value={defaultDcTerms}
                    onChange={(e) => setDefaultDcTerms(e.target.value)}
                    placeholder="Enter default transport and acknowledgement conditions..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultDeliveryTerms && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultDeliveryTerms}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sales-returns" && (
          <div className="space-y-6">
            {/* Sales Return Numbering Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Hash size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Sales Return Numbering Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="srPrefix">Prefix *</Label>
                  <Input
                    id="srPrefix"
                    value={srPrefix}
                    onChange={(e) => setSrPrefix(e.target.value)}
                    placeholder="SR-"
                    className="mt-1.5"
                  />
                  {fieldErrors.salesReturnPrefix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.salesReturnPrefix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. SR-, RET-, SR/</p>
                </div>

                <div>
                  <Label htmlFor="srSuffix">Suffix (Optional)</Label>
                  <Input
                    id="srSuffix"
                    value={srSuffix}
                    onChange={(e) => setSrSuffix(e.target.value)}
                    placeholder="/2026"
                    className="mt-1.5"
                  />
                  {fieldErrors.salesReturnSuffix && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.salesReturnSuffix}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. /2026, /FY26</p>
                </div>

                <div>
                  <Label htmlFor="srNextNumber">Next Sequence Number *</Label>
                  <Input
                    id="srNextNumber"
                    type="number"
                    min="1"
                    max="999999999"
                    value={srNextNumber}
                    onChange={(e) => setSrNextNumber(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.salesReturnNextNumber && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.salesReturnNextNumber}</p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">Counter increments automatically when a return is created.</p>
                </div>

                <div>
                  <Label htmlFor="srPadding">Minimum Digits Padding *</Label>
                  <Select
                    id="srPadding"
                    value={srPadding}
                    onChange={(val) => setSrPadding(val)}
                    options={paddingOptions}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-light" />
                  <span className="text-xs sm:text-sm font-medium text-text-secondary">
                    Next Generated Sales Return Number Preview:
                  </span>
                </div>
                <span className="font-mono text-sm sm:text-base font-bold text-text-primary bg-surface-card px-3 py-1.5 rounded border border-border">
                  {previewSrNumber}
                </span>
              </div>
            </div>

            {/* Sales Return Defaults Card */}
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Undo2 size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Sales Return Policy &amp; Defaults
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="defaultSrReason">Default Return Reason</Label>
                  <Input
                    id="defaultSrReason"
                    value={defaultSrReason}
                    onChange={(e) => setDefaultSrReason(e.target.value)}
                    placeholder="e.g. Defective or damaged in transit"
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultReturnReason && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultReturnReason}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="defaultSrPolicy">Standard Return Policy &amp; Terms</Label>
                  <Textarea
                    id="defaultSrPolicy"
                    rows={4}
                    value={defaultSrPolicy}
                    onChange={(e) => setDefaultSrPolicy(e.target.value)}
                    placeholder="Enter default return policy conditions, inspection terms, and credit note rules..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultReturnPolicy && (
                    <p className="mt-1 text-xs text-danger">{fieldErrors.defaultReturnPolicy}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons with Proper Padding */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/80">
          <Button
            type="button"
            variant="secondary"
            onClick={handleResetToDefaults}
            disabled={isPending}
            className="w-full sm:w-auto h-10 px-4 text-sm font-medium"
          >
            <RotateCcw size={15} />
            <span>Reset to Defaults</span>
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="w-full sm:w-auto h-10 px-5 text-sm font-semibold shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
