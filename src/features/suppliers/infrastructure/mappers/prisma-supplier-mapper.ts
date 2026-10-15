import type { Supplier as PrismaSupplier } from "@/generated/prisma/client";
import type {
  Supplier,
  SupplierGstTreatment,
  SupplierStatus,
} from "../../domain/entities/supplier";

export const toDomainSupplier = (row: PrismaSupplier): Supplier => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  status: row.status as SupplierStatus,
  contactPerson: row.contactPerson,
  email: row.email,
  phone: row.phone,
  alternatePhone: row.alternatePhone,
  billingAddress: {
    addressLine1: row.billingAddressLine1 ?? "",
    addressLine2: row.billingAddressLine2,
    city: row.billingCity ?? "",
    state: row.billingState ?? "",
    pinCode: row.billingPinCode ?? "",
    country: row.billingCountry ?? "India",
  },
  shippingAddress: {
    addressLine1: row.shippingAddressLine1 ?? "",
    addressLine2: row.shippingAddressLine2,
    city: row.shippingCity ?? "",
    state: row.shippingState ?? "",
    pinCode: row.shippingPinCode ?? "",
    country: row.shippingCountry ?? "India",
  },
  sameAsBillingAddress: row.sameAsBillingAddress,
  gstTreatment: row.gstTreatment as SupplierGstTreatment,
  gstin: row.gstin,
  pan: row.pan,
  currency: row.currency,
  paymentTerms: row.paymentTerms,
  internalNotes: row.internalNotes,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});
