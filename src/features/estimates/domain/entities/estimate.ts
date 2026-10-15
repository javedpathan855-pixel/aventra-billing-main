export type EstimateStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Converted"
  | "Cancelled";

export type TaxMode = "CGST_SGST" | "IGST";

export type EstimateLineItem = {
  id: string;
  productId?: string;
  item: string;
  description: string;
  hsnSac?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type Estimate = {
  id: string;
  estimateNumber: string;
  customer: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  customerPlaceOfSupply?: string;
  customerId?: string;
  referenceNumber?: string;
  issueDate: string;
  validUntil: string;
  status: EstimateStatus;
  taxMode: TaxMode;
  notes: string;
  terms: string;
  items: EstimateLineItem[];
  additionalCharges?: number;
  additionalChargesLabel?: string;
  additionalDiscount?: number;
  additionalDiscountType?: "percentage" | "fixed";
  additionalDiscountLabel?: string;
  convertedToInvoiceId?: string;
  convertedToSalesOrderId?: string;
  convertedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EstimateTotals = {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  additionalCharges?: number;
  additionalDiscount?: number;
};
