import type { Estimate, EstimateStatus, TaxMode } from "../../domain/entities/estimate";

export type EstimateLineItemInputDto = {
  id?: string;
  productId?: string;
  item: string;
  description?: string;
  hsnSac?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type CreateEstimateInputDto = {
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  customerPlaceOfSupply?: string;
  referenceNumber?: string;
  issueDate: string;
  validUntil: string;
  status?: EstimateStatus;
  taxMode?: TaxMode;
  notes?: string;
  terms?: string;
  items: EstimateLineItemInputDto[];
  additionalCharges?: number;
  additionalChargesLabel?: string;
  additionalDiscount?: number;
  additionalDiscountType?: "percentage" | "fixed";
  additionalDiscountLabel?: string;
};

export type UpdateEstimateInputDto = CreateEstimateInputDto & {
  id: string;
};

export type EstimateActionResult<T = Estimate> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
