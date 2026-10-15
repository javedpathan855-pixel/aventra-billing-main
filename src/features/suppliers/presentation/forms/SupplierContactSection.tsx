"use client";

import { Contact } from "lucide-react";
import { Input, Label } from "@/shared/components/form";

export type SupplierContactSectionProps = {
  contactPerson: string;
  onContactPersonChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
  alternatePhone: string;
  onAlternatePhoneChange: (val: string) => void;
  emailError?: string;
  phoneError?: string;
  alternatePhoneError?: string;
};

export const SupplierContactSection = ({
  contactPerson,
  onContactPersonChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  alternatePhone,
  onAlternatePhoneChange,
  emailError,
  phoneError,
  alternatePhoneError,
}: SupplierContactSectionProps) => {
  return (
    <section className="rounded-xl border border-border bg-surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border/60 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-alt text-primary-light">
          <Contact size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Contact Information
          </h2>
          <p className="text-xs text-text-secondary">
            Who to reach for orders, deliveries, and payments.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="supplier-contact-person" className="text-xs">
            Contact Person
          </Label>
          <Input
            id="supplier-contact-person"
            value={contactPerson}
            onChange={(e) => onContactPersonChange(e.target.value)}
            placeholder="Full name of contact person..."
            maxLength={100}
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supplier-email" className="text-xs">
            Email Address
          </Label>
          <Input
            id="supplier-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="accounts@supplier.com"
            aria-invalid={Boolean(emailError)}
            className="h-10 text-sm"
          />
          {emailError && (
            <p className="text-xs text-danger" role="alert">
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supplier-phone" className="text-xs">
            Phone Number
          </Label>
          <Input
            id="supplier-phone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+91 98220 00000"
            aria-invalid={Boolean(phoneError)}
            className="h-10 text-sm"
          />
          {phoneError && (
            <p className="text-xs text-danger" role="alert">
              {phoneError}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="supplier-alternate-phone" className="text-xs">
            Alternate Phone
          </Label>
          <Input
            id="supplier-alternate-phone"
            type="tel"
            value={alternatePhone}
            onChange={(e) => onAlternatePhoneChange(e.target.value)}
            placeholder="Backup contact number..."
            aria-invalid={Boolean(alternatePhoneError)}
            className="h-10 text-sm"
          />
          {alternatePhoneError && (
            <p className="text-xs text-danger" role="alert">
              {alternatePhoneError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
