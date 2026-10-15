"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock,
  Hash,
  Loader2,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Undo2,
  X,
} from "lucide-react";
import { Input, Label, Textarea, Select, Button } from "@/shared/components/form";
import { Tabs, type TabItem } from "@/shared/components/Tabs";
import type { PurchaseSettings } from "../../domain/entities/purchase-settings";
import { DEFAULT_PURCHASE_SETTINGS } from "../../domain/rules/purchase-settings-rules";
import { savePurchaseSettingsAction } from "../../data/mutations/save-purchase-settings";
import { PurchaseOrderNumberPreview } from "../components/PurchaseOrderNumberPreview";
import { PurchaseBillNumberPreview } from "../components/PurchaseBillNumberPreview";
import { PurchaseReturnNumberPreview } from "../components/PurchaseReturnNumberPreview";

export type PurchaseSettingsFormProps = {
  initialSettings: PurchaseSettings;
};

type PurchaseSettingsTabId = "purchase-orders" | "purchase-bills" | "purchase-returns";

const purchaseSettingsTabs: readonly TabItem[] = [
  {
    id: "purchase-orders",
    label: "Purchase Orders",
    icon: <ShoppingCart size={16} />,
  },
  {
    id: "purchase-bills",
    label: "Purchase Bills",
    icon: <ReceiptText size={16} />,
  },
  {
    id: "purchase-returns",
    label: "Purchase Returns",
    icon: <Undo2 size={16} />,
  },
];

const paddingOptions = [
  { value: "3", label: "3 digits (e.g. 001)" },
  { value: "4", label: "4 digits (e.g. 0001 - Standard)" },
  { value: "5", label: "5 digits (e.g. 00001)" },
  { value: "6", label: "6 digits (e.g. 000001)" },
  { value: "8", label: "8 digits (e.g. 00000001)" },
];

export const PurchaseSettingsForm = ({
  initialSettings,
}: PurchaseSettingsFormProps) => {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<PurchaseSettingsTabId>("purchase-orders");

  const [poPrefix, setPoPrefix] = useState(
    initialSettings.purchaseOrderPrefix || "PO-",
  );
  const [poSuffix, setPoSuffix] = useState(
    initialSettings.purchaseOrderSuffix || "",
  );
  const [poNextNumber, setPoNextNumber] = useState<string>(
    String(initialSettings.purchaseOrderNextNumber || 1),
  );
  const [poPadding, setPoPadding] = useState<string>(
    String(initialSettings.purchaseOrderPadding || 4),
  );
  const [deliveryDays, setDeliveryDays] = useState<string>(
    String(initialSettings.defaultDeliveryDays || 15),
  );
  const [paymentTerms, setPaymentTerms] = useState(
    initialSettings.defaultPaymentTerms || "",
  );
  const [defaultPoNotes, setDefaultPoNotes] = useState(
    initialSettings.defaultPurchaseOrderNotes || "",
  );
  const [defaultPoTerms, setDefaultPoTerms] = useState(
    initialSettings.defaultPurchaseOrderTerms || "",
  );
  const [billPrefix, setBillPrefix] = useState(
    initialSettings.purchaseBillPrefix || "PB-",
  );
  const [billSuffix, setBillSuffix] = useState(
    initialSettings.purchaseBillSuffix || "",
  );
  const [billNextNumber, setBillNextNumber] = useState<string>(
    String(initialSettings.purchaseBillNextNumber || 1),
  );
  const [billPadding, setBillPadding] = useState<string>(
    String(initialSettings.purchaseBillPadding || 4),
  );
  const [dueDays, setDueDays] = useState<string>(
    String(initialSettings.defaultDueDays || 30),
  );
  const [defaultBillNotes, setDefaultBillNotes] = useState(
    initialSettings.defaultPurchaseBillNotes || "",
  );
  const [defaultBillTerms, setDefaultBillTerms] = useState(
    initialSettings.defaultPurchaseBillTerms || "",
  );
  const [returnPrefix, setReturnPrefix] = useState(
    initialSettings.purchaseReturnPrefix || "PR-",
  );
  const [returnSuffix, setReturnSuffix] = useState(
    initialSettings.purchaseReturnSuffix || "",
  );
  const [returnNextNumber, setReturnNextNumber] = useState<string>(
    String(initialSettings.purchaseReturnNextNumber || 1),
  );
  const [returnPadding, setReturnPadding] = useState<string>(
    String(initialSettings.purchaseReturnPadding || 4),
  );
  const [defaultReturnReason, setDefaultReturnReason] = useState(
    initialSettings.defaultPurchaseReturnReason || "",
  );
  const [defaultReturnNotes, setDefaultReturnNotes] = useState(
    initialSettings.defaultPurchaseReturnNotes || "",
  );
  const [defaultReturnTerms, setDefaultReturnTerms] = useState(
    initialSettings.defaultPurchaseReturnTerms || "",
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const poNumVal = parseInt(poNextNumber, 10);
  const poPaddingVal = parseInt(poPadding, 10) || 4;
  const billNumVal = parseInt(billNextNumber, 10);
  const billPaddingVal = parseInt(billPadding, 10) || 4;
  const returnNumVal = parseInt(returnNextNumber, 10);
  const returnPaddingVal = parseInt(returnPadding, 10) || 4;

  const handleResetToDefaults = () => {
    if (activeTab === "purchase-orders") {
      setPoPrefix(DEFAULT_PURCHASE_SETTINGS.purchaseOrderPrefix);
      setPoSuffix(DEFAULT_PURCHASE_SETTINGS.purchaseOrderSuffix || "");
      setPoNextNumber(String(DEFAULT_PURCHASE_SETTINGS.purchaseOrderNextNumber));
      setPoPadding(String(DEFAULT_PURCHASE_SETTINGS.purchaseOrderPadding));
      setDeliveryDays(String(DEFAULT_PURCHASE_SETTINGS.defaultDeliveryDays));
      setPaymentTerms(DEFAULT_PURCHASE_SETTINGS.defaultPaymentTerms || "");
      setDefaultPoNotes(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseOrderNotes || "");
      setDefaultPoTerms(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseOrderTerms || "");
    } else if (activeTab === "purchase-bills") {
      setBillPrefix(DEFAULT_PURCHASE_SETTINGS.purchaseBillPrefix);
      setBillSuffix(DEFAULT_PURCHASE_SETTINGS.purchaseBillSuffix || "");
      setBillNextNumber(String(DEFAULT_PURCHASE_SETTINGS.purchaseBillNextNumber));
      setBillPadding(String(DEFAULT_PURCHASE_SETTINGS.purchaseBillPadding));
      setDueDays(String(DEFAULT_PURCHASE_SETTINGS.defaultDueDays));
      setDefaultBillNotes(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseBillNotes || "");
      setDefaultBillTerms(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseBillTerms || "");
    } else if (activeTab === "purchase-returns") {
      setReturnPrefix(DEFAULT_PURCHASE_SETTINGS.purchaseReturnPrefix);
      setReturnSuffix(DEFAULT_PURCHASE_SETTINGS.purchaseReturnSuffix || "");
      setReturnNextNumber(String(DEFAULT_PURCHASE_SETTINGS.purchaseReturnNextNumber));
      setReturnPadding(String(DEFAULT_PURCHASE_SETTINGS.purchaseReturnPadding));
      setDefaultReturnReason(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseReturnReason || "");
      setDefaultReturnNotes(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseReturnNotes || "");
      setDefaultReturnTerms(DEFAULT_PURCHASE_SETTINGS.defaultPurchaseReturnTerms || "");
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

    const numericPoNextNumber = parseInt(poNextNumber, 10);
    if (isNaN(numericPoNextNumber) || numericPoNextNumber < 1) {
      setFieldErrors({
        purchaseOrderNextNumber:
          "Sequence number must be a positive integer greater than or equal to 1.",
      });
      return;
    }

    const numericDeliveryDays = parseInt(deliveryDays, 10);
    if (
      isNaN(numericDeliveryDays) ||
      numericDeliveryDays < 1 ||
      numericDeliveryDays > 365
    ) {
      setFieldErrors({
        defaultDeliveryDays: "Delivery period must be between 1 and 365 days.",
      });
      return;
    }

    const numericBillNextNumber = parseInt(billNextNumber, 10);
    if (isNaN(numericBillNextNumber) || numericBillNextNumber < 1) {
      setFieldErrors({
        purchaseBillNextNumber:
          "Sequence number must be a positive integer greater than or equal to 1.",
      });
      return;
    }

    const numericDueDays = parseInt(dueDays, 10);
    if (isNaN(numericDueDays) || numericDueDays < 1 || numericDueDays > 365) {
      setFieldErrors({
        defaultDueDays: "Due period must be between 1 and 365 days.",
      });
      return;
    }

    const numericReturnNextNumber = parseInt(returnNextNumber, 10);
    if (isNaN(numericReturnNextNumber) || numericReturnNextNumber < 1) {
      setFieldErrors({
        purchaseReturnNextNumber:
          "Sequence number must be a positive integer greater than or equal to 1.",
      });
      return;
    }

    startTransition(async () => {
      const result = await savePurchaseSettingsAction({
        purchaseOrderPrefix: poPrefix.trim(),
        purchaseOrderSuffix: poSuffix.trim() || null,
        purchaseOrderNextNumber: numericPoNextNumber,
        purchaseOrderPadding: poPaddingVal,
        defaultDeliveryDays: numericDeliveryDays,
        defaultPaymentTerms: paymentTerms.trim() || null,
        defaultPurchaseOrderNotes: defaultPoNotes.trim() || null,
        defaultPurchaseOrderTerms: defaultPoTerms.trim() || null,
        purchaseBillPrefix: billPrefix.trim(),
        purchaseBillSuffix: billSuffix.trim() || null,
        purchaseBillNextNumber: numericBillNextNumber,
        purchaseBillPadding: billPaddingVal,
        defaultDueDays: numericDueDays,
        defaultPurchaseBillNotes: defaultBillNotes.trim() || null,
        defaultPurchaseBillTerms: defaultBillTerms.trim() || null,
        purchaseReturnPrefix: returnPrefix.trim(),
        purchaseReturnSuffix: returnSuffix.trim() || null,
        purchaseReturnNextNumber: numericReturnNextNumber,
        purchaseReturnPadding: returnPaddingVal,
        defaultPurchaseReturnReason: defaultReturnReason.trim() || null,
        defaultPurchaseReturnNotes: defaultReturnNotes.trim() || null,
        defaultPurchaseReturnTerms: defaultReturnTerms.trim() || null,
      });

      if (!result.success) {
        setFormError(result.error || "Failed to save purchase settings.");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }

      setSuccessMessage("Purchase settings saved successfully.");
      if (result.data) {
        setPoNextNumber(String(result.data.purchaseOrderNextNumber));
        setBillNextNumber(String(result.data.purchaseBillNextNumber));
        setReturnNextNumber(String(result.data.purchaseReturnNextNumber));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Horizontal Tabs using shared Tabs component */}
      <Tabs
        tabs={purchaseSettingsTabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as PurchaseSettingsTabId)}
        ariaLabel="Purchase Document Settings"
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

        {activeTab === "purchase-orders" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Hash size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Purchase Order Numbering Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="poPrefix">Prefix *</Label>
                  <Input
                    id="poPrefix"
                    value={poPrefix}
                    onChange={(e) => setPoPrefix(e.target.value)}
                    placeholder="PO-"
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseOrderPrefix && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseOrderPrefix}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. PO-, PUR-, PO/</p>
                </div>

                <div>
                  <Label htmlFor="poSuffix">Suffix (Optional)</Label>
                  <Input
                    id="poSuffix"
                    value={poSuffix}
                    onChange={(e) => setPoSuffix(e.target.value)}
                    placeholder="/2026"
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseOrderSuffix && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseOrderSuffix}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. /2026, /FY26</p>
                </div>

                <div>
                  <Label htmlFor="poNextNumber">Next Sequence Number *</Label>
                  <Input
                    id="poNextNumber"
                    type="number"
                    min="1"
                    max="999999999"
                    value={poNextNumber}
                    onChange={(e) => setPoNextNumber(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseOrderNextNumber && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseOrderNextNumber}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    Counter increments automatically when a purchase order is created.
                  </p>
                </div>

                <div>
                  <Label htmlFor="poPadding">Minimum Digits Padding *</Label>
                  <Select
                    id="poPadding"
                    value={poPadding}
                    onChange={(val) => setPoPadding(val)}
                    options={paddingOptions}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <PurchaseOrderNumberPreview
                prefix={poPrefix}
                nextNumber={isNaN(poNumVal) ? 1 : Math.max(1, poNumVal)}
                padding={poPaddingVal}
                suffix={poSuffix}
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <ShoppingCart size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Purchase Order Defaults
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="defaultDeliveryDays">
                    Default Delivery Window (Days) *
                  </Label>
                  <Input
                    id="defaultDeliveryDays"
                    type="number"
                    min="1"
                    max="365"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultDeliveryDays && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultDeliveryDays}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    Used to automatically compute expected delivery dates on new
                    purchase orders.
                  </p>
                </div>

                <div>
                  <Label htmlFor="defaultPaymentTerms">Default Payment Terms</Label>
                  <Input
                    id="defaultPaymentTerms"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Net 30 days"
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPaymentTerms && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPaymentTerms}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    Prefilled on new purchase orders; editable per order.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
                <div>
                  <Label htmlFor="defaultPoNotes">Default Supplier Notes</Label>
                  <Textarea
                    id="defaultPoNotes"
                    rows={4}
                    value={defaultPoNotes}
                    onChange={(e) => setDefaultPoNotes(e.target.value)}
                    placeholder="Enter default notes prefilled on new purchase orders..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPurchaseOrderNotes && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPurchaseOrderNotes}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="defaultPoTerms">
                    Default Commercial Terms &amp; Conditions
                  </Label>
                  <Textarea
                    id="defaultPoTerms"
                    rows={4}
                    value={defaultPoTerms}
                    onChange={(e) => setDefaultPoTerms(e.target.value)}
                    placeholder="Enter default receipt and payment terms..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPurchaseOrderTerms && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPurchaseOrderTerms}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4 flex items-start gap-2">
                <Clock size={16} className="text-primary-light mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  New purchase orders prefill the delivery window, payment terms,
                  notes, and terms above. Changing these defaults affects only
                  subsequently created orders; existing orders keep their stored
                  values.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "purchase-bills" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Hash size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Purchase Bill Numbering Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="billPrefix">Prefix *</Label>
                  <Input
                    id="billPrefix"
                    value={billPrefix}
                    onChange={(e) => setBillPrefix(e.target.value)}
                    placeholder="PB-"
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseBillPrefix && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseBillPrefix}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. PB-, BILL-, PB/</p>
                </div>

                <div>
                  <Label htmlFor="billSuffix">Suffix (Optional)</Label>
                  <Input
                    id="billSuffix"
                    value={billSuffix}
                    onChange={(e) => setBillSuffix(e.target.value)}
                    placeholder="/2026"
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseBillSuffix && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseBillSuffix}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. /2026, /FY26</p>
                </div>

                <div>
                  <Label htmlFor="billNextNumber">Next Sequence Number *</Label>
                  <Input
                    id="billNextNumber"
                    type="number"
                    min="1"
                    max="999999999"
                    value={billNextNumber}
                    onChange={(e) => setBillNextNumber(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseBillNextNumber && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseBillNextNumber}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    Counter increments automatically when a purchase bill is created.
                  </p>
                </div>

                <div>
                  <Label htmlFor="billPadding">Minimum Digits Padding *</Label>
                  <Select
                    id="billPadding"
                    value={billPadding}
                    onChange={(val) => setBillPadding(val)}
                    options={paddingOptions}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <PurchaseBillNumberPreview
                prefix={billPrefix}
                nextNumber={isNaN(billNumVal) ? 1 : Math.max(1, billNumVal)}
                padding={billPaddingVal}
                suffix={billSuffix}
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <ShoppingCart size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Purchase Bill Defaults
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="defaultDueDays">
                    Default Due Window (Days) *
                  </Label>
                  <Input
                    id="defaultDueDays"
                    type="number"
                    min="1"
                    max="365"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultDueDays && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultDueDays}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    Used to automatically compute due dates on new purchase bills.
                    Payment terms are shared with purchase orders above.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
                <div>
                  <Label htmlFor="defaultBillNotes">Default Bill Notes</Label>
                  <Textarea
                    id="defaultBillNotes"
                    rows={4}
                    value={defaultBillNotes}
                    onChange={(e) => setDefaultBillNotes(e.target.value)}
                    placeholder="Enter default notes prefilled on new purchase bills..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPurchaseBillNotes && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPurchaseBillNotes}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="defaultBillTerms">
                    Default Commercial Terms &amp; Conditions
                  </Label>
                  <Textarea
                    id="defaultBillTerms"
                    rows={4}
                    value={defaultBillTerms}
                    onChange={(e) => setDefaultBillTerms(e.target.value)}
                    placeholder="Enter default matching and payment terms..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPurchaseBillTerms && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPurchaseBillTerms}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4 flex items-start gap-2">
                <Clock size={16} className="text-primary-light mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  New purchase bills prefill the due window, notes, and terms above.
                  Changing these defaults affects only subsequently created bills;
                  existing bills keep their stored values.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "purchase-returns" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <Hash size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Purchase Return Numbering Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="returnPrefix">Prefix *</Label>
                  <Input
                    id="returnPrefix"
                    value={returnPrefix}
                    onChange={(e) => setReturnPrefix(e.target.value)}
                    placeholder="PR-"
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseReturnPrefix && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseReturnPrefix}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. PR-, RET-, PR/</p>
                </div>

                <div>
                  <Label htmlFor="returnSuffix">Suffix (Optional)</Label>
                  <Input
                    id="returnSuffix"
                    value={returnSuffix}
                    onChange={(e) => setReturnSuffix(e.target.value)}
                    placeholder="/2026"
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseReturnSuffix && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseReturnSuffix}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">e.g. /2026, /FY26</p>
                </div>

                <div>
                  <Label htmlFor="returnNextNumber">Next Sequence Number *</Label>
                  <Input
                    id="returnNextNumber"
                    type="number"
                    min="1"
                    max="999999999"
                    value={returnNextNumber}
                    onChange={(e) => setReturnNextNumber(e.target.value)}
                    className="mt-1.5"
                  />
                  {fieldErrors.purchaseReturnNextNumber && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.purchaseReturnNextNumber}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    Counter increments automatically when a purchase return is created.
                  </p>
                </div>

                <div>
                  <Label htmlFor="returnPadding">Minimum Digits Padding *</Label>
                  <Select
                    id="returnPadding"
                    value={returnPadding}
                    onChange={(val) => setReturnPadding(val)}
                    options={paddingOptions}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <PurchaseReturnNumberPreview
                prefix={returnPrefix}
                nextNumber={isNaN(returnNumVal) ? 1 : Math.max(1, returnNumVal)}
                padding={returnPaddingVal}
                suffix={returnSuffix}
              />
            </div>

            <div className="rounded-xl border border-border bg-surface-card p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                <ShoppingCart size={18} className="text-primary-light" />
                <h2 className="text-base font-semibold text-text-primary">
                  Purchase Return Defaults
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <Label htmlFor="defaultReturnReason">Default Return Reason</Label>
                  <Input
                    id="defaultReturnReason"
                    value={defaultReturnReason}
                    onChange={(e) => setDefaultReturnReason(e.target.value)}
                    placeholder="e.g. Defective or damaged in transit"
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPurchaseReturnReason && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPurchaseReturnReason}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">
                    Prefilled as the reason on new purchase returns; editable per return.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
                <div>
                  <Label htmlFor="defaultReturnNotes">Default Return Notes</Label>
                  <Textarea
                    id="defaultReturnNotes"
                    rows={4}
                    value={defaultReturnNotes}
                    onChange={(e) => setDefaultReturnNotes(e.target.value)}
                    placeholder="Enter default notes prefilled on new purchase returns..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPurchaseReturnNotes && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPurchaseReturnNotes}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="defaultReturnTerms">
                    Default Commercial Terms &amp; Conditions
                  </Label>
                  <Textarea
                    id="defaultReturnTerms"
                    rows={4}
                    value={defaultReturnTerms}
                    onChange={(e) => setDefaultReturnTerms(e.target.value)}
                    placeholder="Enter default return inspection and credit terms..."
                    className="mt-1.5"
                  />
                  {fieldErrors.defaultPurchaseReturnTerms && (
                    <p className="mt-1 text-xs text-danger">
                      {fieldErrors.defaultPurchaseReturnTerms}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-surface-alt/40 p-4 flex items-start gap-2">
                <Clock size={16} className="text-primary-light mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  New purchase returns prefill the reason, notes, and terms above.
                  Changing these defaults affects only subsequently created returns;
                  existing returns keep their stored values.
                </p>
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
