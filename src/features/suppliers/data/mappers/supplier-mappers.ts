import type { Supplier } from "../../domain/entities/supplier";
import type { SupplierDto } from "../dto/supplier-dto";

export const toSupplierDto = (supplier: Supplier): SupplierDto => ({
  id: supplier.id,
  organizationId: supplier.organizationId,
  name: supplier.name,
  status: supplier.status,
  contactPerson: supplier.contactPerson ?? null,
  email: supplier.email ?? null,
  phone: supplier.phone ?? null,
  alternatePhone: supplier.alternatePhone ?? null,
  billingAddress: supplier.billingAddress,
  shippingAddress: supplier.shippingAddress,
  sameAsBillingAddress: supplier.sameAsBillingAddress,
  gstTreatment: supplier.gstTreatment,
  gstin: supplier.gstin ?? null,
  pan: supplier.pan ?? null,
  currency: supplier.currency,
  paymentTerms: supplier.paymentTerms ?? null,
  internalNotes: supplier.internalNotes ?? null,
  createdAt: supplier.createdAt.toISOString(),
  updatedAt: supplier.updatedAt.toISOString(),
});
