import type {
  SupplierAddress,
  SupplierGstTreatment,
  SupplierStatus,
} from "../../domain/entities/supplier";

export type SupplierDto = {
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
  createdAt: string;
  updatedAt: string;
};

export type CreateSupplierInput = {
  name: string;
  status?: SupplierStatus;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  billingAddress: SupplierAddress;
  shippingAddress?: SupplierAddress | null;
  sameAsBillingAddress?: boolean;
  gstTreatment?: SupplierGstTreatment;
  gstin?: string | null;
  pan?: string | null;
  currency?: string;
  paymentTerms?: string | null;
  internalNotes?: string | null;
};

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export type SupplierFilterInput = {
  query?: string;
  status?: SupplierStatus | "ALL";
  page?: number;
  pageSize?: number;
};

export type SupplierActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
