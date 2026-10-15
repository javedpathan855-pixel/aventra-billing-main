export type PurchaseOrderStatus =
  | "Draft"
  | "Confirmed"
  | "PartiallyReceived"
  | "Received"
  | "Cancelled";

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId?: string;
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  unit?: string | null;
  quantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
};

export type PurchaseOrder = {
  id: string;
  organizationId: string;
  orderNumber: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  referenceNumber?: string | null;
  status: PurchaseOrderStatus;
  taxMode: "CGST_SGST" | "IGST";
  currency: string;
  paymentTerms?: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseOrderItem[];
};

export type TaxBreakdownSlab = {
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type PurchaseOrderTotals = {
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
  totalReceivedQuantity: number;
  totalRemainingQuantity: number;
  receivingPercentage: number;
};
