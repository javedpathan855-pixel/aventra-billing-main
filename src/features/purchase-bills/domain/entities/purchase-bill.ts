export type PurchaseBillStatus = "Draft" | "Confirmed" | "Cancelled";

export type PurchaseBillItem = {
  id: string;
  purchaseBillId?: string;
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
};

export type PurchaseBill = {
  id: string;
  organizationId: string;
  billNumber: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  supplierInvoiceNumber?: string | null;
  supplierInvoiceDate?: string | null;
  purchaseOrderId?: string | null;
  purchaseOrderNumber?: string | null;
  billDate: string;
  dueDate: string;
  status: PurchaseBillStatus;
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
  items: PurchaseBillItem[];
};

export type TaxBreakdownSlab = {
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
};

export type PurchaseBillTotals = {
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
};
