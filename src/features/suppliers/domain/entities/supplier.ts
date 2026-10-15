export type SupplierStatus = "ACTIVE" | "INACTIVE";

export type SupplierGstTreatment =
  | "REGISTERED_BUSINESS_REGULAR"
  | "CONSUMER_UNREGISTERED"
  | "OVERSEAS_EXPORT"
  | "SPECIAL_ECONOMIC_ZONE"
  | "DEEMED_EXPORT"
  | "COMPOSITION_SCHEME";

export type SupplierAddress = {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pinCode: string;
  country: string;
};

export type Supplier = {
  id: string;
  organizationId: string;
  name: string;
  status: SupplierStatus;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  billingAddress: SupplierAddress;
  shippingAddress: SupplierAddress;
  sameAsBillingAddress: boolean;
  gstTreatment: SupplierGstTreatment;
  gstin?: string | null;
  pan?: string | null;
  currency: string;
  paymentTerms?: string | null;
  internalNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SupplierListFilter = {
  query?: string;
  status?: SupplierStatus | "ALL";
  limit?: number;
  offset?: number;
};

/**
 * Derives a human-readable 1-to-2 letter uppercase initials code from a supplier name.
 */
export const getSupplierInitials = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return "SU";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return (words[0]?.slice(0, 2) ?? "SU").toUpperCase();
  }

  const first = words[0]?.[0] ?? "";
  const second = words[words.length - 1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
};

/**
 * Formats a structured address into a clean single-line representation.
 */
export const formatSupplierAddress = (address?: Partial<SupplierAddress> | null): string => {
  if (!address) return "";

  const parts = [
    address.addressLine1?.trim(),
    address.addressLine2?.trim(),
    address.city?.trim(),
    address.state?.trim(),
    address.pinCode?.trim(),
  ].filter(Boolean);

  return parts.join(", ");
};
