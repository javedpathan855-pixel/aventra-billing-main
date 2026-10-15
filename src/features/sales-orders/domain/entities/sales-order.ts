export type SalesOrderStatus =
  | "Draft"
  | "Confirmed"
  | "PartiallyFulfilled"
  | "Fulfilled"
  | "Cancelled";

export type SalesOrderItem = {
  id: string;
  salesOrderId?: string;
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  unit?: string | null;
  quantity: number;
  fulfilledQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
};

export type RelatedInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  total: number;
};

export type SalesOrder = {
  id: string;
  organizationId: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  referenceNumber?: string | null;
  status: SalesOrderStatus;
  taxMode: "CGST_SGST" | "IGST";
  currency: string;
  subtotal: number;
  lineDiscountTotal: number;
  additionalDiscount: number;
  additionalDiscountType: "fixed" | "percentage";
  additionalDiscountLabel?: string | null;
  additionalCharges: number;
  additionalChargesLabel?: string | null;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  sourceEstimateId?: string | null;
  sourceEstimateNumber?: string | null;
  invoices?: RelatedInvoiceSummary[];
  createdAt: Date;
  updatedAt: Date;
  items: SalesOrderItem[];
};

export type TaxBreakdownSlab = {
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type SalesOrderTotals = {
  subtotal: number;
  lineDiscountTotal: number;
  effectiveAdditionalDiscount: number;
  additionalCharges: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  taxBreakdown: TaxBreakdownSlab[];
  totalOrderedQuantity: number;
  totalFulfilledQuantity: number;
  totalRemainingQuantity: number;
  fulfilmentPercentage: number;
};
