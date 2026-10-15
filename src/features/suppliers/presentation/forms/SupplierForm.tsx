"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/shared/components/form/Button";
import type { SupplierDto, CreateSupplierInput } from "../../data/dto/supplier-dto";
import type {
  SupplierAddress,
  SupplierGstTreatment,
  SupplierStatus,
} from "../../domain/entities/supplier";
import { createSupplierAction } from "../../data/mutations/create-supplier";
import { updateSupplierAction } from "../../data/mutations/update-supplier";
import { derivePanFromGstin } from "../../domain/rules/supplier-rules";
import { SupplierBasicInformationSection } from "./SupplierBasicInformationSection";
import { SupplierContactSection } from "./SupplierContactSection";
import { SupplierBillingAddressSection } from "./SupplierBillingAddressSection";
import { SupplierShippingAddressSection } from "./SupplierShippingAddressSection";
import { SupplierTaxSection } from "./SupplierTaxSection";
import { SupplierTermsNotesSection } from "./SupplierTermsNotesSection";

export type SupplierFormProps = {
  initialData?: SupplierDto | null;
  isEdit?: boolean;
};

const defaultAddress: SupplierAddress = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "Maharashtra",
  pinCode: "",
  country: "India",
};

export const SupplierForm = ({ initialData, isEdit = false }: SupplierFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Basic Information
  const [name, setName] = useState(initialData?.name || "");
  const [status, setStatus] = useState<SupplierStatus>(
    initialData?.status || "ACTIVE",
  );

  // Contact Information
  const [contactPerson, setContactPerson] = useState(
    initialData?.contactPerson || "",
  );
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [alternatePhone, setAlternatePhone] = useState(
    initialData?.alternatePhone || "",
  );

  // Billing and Shipping Addresses
  const [billingAddress, setBillingAddress] = useState<SupplierAddress>(
    initialData?.billingAddress || defaultAddress,
  );
  const [shippingAddress, setShippingAddress] = useState<SupplierAddress>(
    initialData?.shippingAddress || defaultAddress,
  );
  const [sameAsBillingAddress, setSameAsBillingAddress] = useState(
    initialData?.sameAsBillingAddress ?? true,
  );

  // Tax and Compliance
  const [gstTreatment, setGstTreatment] = useState<SupplierGstTreatment>(
    initialData?.gstTreatment || "REGISTERED_BUSINESS_REGULAR",
  );
  const [gstin, setGstin] = useState(initialData?.gstin || "");
  const [pan, setPan] = useState(initialData?.pan || "");
  const [currency, setCurrency] = useState(initialData?.currency || "INR (₹)");

  // Commercial Terms & Notes
  const [paymentTerms, setPaymentTerms] = useState(
    initialData?.paymentTerms || "",
  );
  const [internalNotes, setInternalNotes] = useState(
    initialData?.internalNotes || "",
  );

  // Error feedback state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const clearFieldError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const buildPayload = (overrideStatus?: SupplierStatus): CreateSupplierInput => {
    return {
      name: name.trim(),
      status: overrideStatus || status,
      contactPerson: contactPerson.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      alternatePhone: alternatePhone.trim() || null,
      billingAddress,
      shippingAddress: sameAsBillingAddress ? { ...billingAddress } : shippingAddress,
      sameAsBillingAddress,
      gstTreatment,
      gstin: gstin.trim() || null,
      pan: pan.trim() || null,
      currency,
      paymentTerms: paymentTerms.trim() || null,
      internalNotes: internalNotes.trim() || null,
    };
  };

  const handleSubmit = (overrideStatus?: SupplierStatus) => {
    setServerError(null);
    setErrors({});

    const payload = buildPayload(overrideStatus);

    startTransition(async () => {
      try {
        if (isEdit && initialData?.id) {
          const res = await updateSupplierAction(initialData.id, payload);
          if (!res.success) {
            setServerError(res.error || "Failed to update supplier.");
            if (res.fieldErrors) setErrors(res.fieldErrors);
            return;
          }
          router.push(`/suppliers/${initialData.id}?saved=1`);
        } else {
          const res = await createSupplierAction(payload);
          if (!res.success) {
            setServerError(res.error || "Failed to create supplier.");
            if (res.fieldErrors) setErrors(res.fieldErrors);
            return;
          }
          router.push("/suppliers?saved=1");
        }
      } catch (err: unknown) {
        setServerError(
          err instanceof Error ? err.message : "An unexpected server error occurred.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-6"
    >
      {/* Global Server Error Banner */}
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {serverError}
        </div>
      )}

      {/* 1. Basic Information */}
      <SupplierBasicInformationSection
        name={name}
        onNameChange={(val: string) => {
          setName(val);
          clearFieldError("name");
        }}
        status={status}
        onStatusChange={(val: SupplierStatus) => setStatus(val)}
        error={errors["name"]}
      />

      {/* 2. Contact Information */}
      <SupplierContactSection
        contactPerson={contactPerson}
        onContactPersonChange={(val: string) => setContactPerson(val)}
        email={email}
        onEmailChange={(val: string) => {
          setEmail(val);
          clearFieldError("email");
        }}
        phone={phone}
        onPhoneChange={(val: string) => {
          setPhone(val);
          clearFieldError("phone");
        }}
        alternatePhone={alternatePhone}
        onAlternatePhoneChange={(val: string) => {
          setAlternatePhone(val);
          clearFieldError("alternatePhone");
        }}
        emailError={errors["email"]}
        phoneError={errors["phone"]}
        alternatePhoneError={errors["alternatePhone"]}
      />

      {/* 3. Billing Address */}
      <SupplierBillingAddressSection
        billingAddress={billingAddress}
        onBillingAddressChange={(updates: Partial<SupplierAddress>) =>
          setBillingAddress((prev) => ({ ...prev, ...updates }))
        }
        errors={errors}
      />

      {/* 4. Shipping Address */}
      <SupplierShippingAddressSection
        shippingAddress={shippingAddress}
        onShippingAddressChange={(updates: Partial<SupplierAddress>) =>
          setShippingAddress((prev) => ({ ...prev, ...updates }))
        }
        sameAsBillingAddress={sameAsBillingAddress}
        onSameAsBillingAddressChange={(val: boolean) => setSameAsBillingAddress(val)}
        errors={errors}
      />

      {/* 5. Tax & Compliance */}
      <SupplierTaxSection
        gstTreatment={gstTreatment}
        onGstTreatmentChange={(val: SupplierGstTreatment) => setGstTreatment(val)}
        gstin={gstin}
        onGstinChange={(val: string) => {
          const cleaned = val.replace(/\s+/g, "").toUpperCase();
          setGstin(cleaned);
          clearFieldError("gstin");

          // Auto-extract PAN from GSTIN (characters 3-12)
          const autoPan = derivePanFromGstin(cleaned);
          if (autoPan) {
            setPan(autoPan);
            clearFieldError("pan");
          }
        }}
        pan={pan}
        onPanChange={(val: string) => {
          setPan(val.replace(/\s+/g, "").toUpperCase());
          clearFieldError("pan");
        }}
        currency={currency}
        onCurrencyChange={(val: string) => setCurrency(val)}
        gstinError={errors["gstin"]}
        panError={errors["pan"]}
      />

      {/* 6. Commercial Terms & Notes */}
      <SupplierTermsNotesSection
        paymentTerms={paymentTerms}
        onPaymentTermsChange={(val: string) => setPaymentTerms(val)}
        internalNotes={internalNotes}
        onInternalNotesChange={(val: string) => setInternalNotes(val)}
      />

      {/* Bottom Action Buttons */}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/suppliers"
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
        >
          <X size={15} />
          <span>Cancel</span>
        </Link>

        {!isEdit && (
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={() => handleSubmit("INACTIVE")}
            className="h-10 px-4 text-sm"
          >
            <Check size={15} />
            <span>Save as Inactive</span>
          </Button>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="h-10 px-5 text-sm shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>{isEdit ? "Update Supplier" : "Create Supplier"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
