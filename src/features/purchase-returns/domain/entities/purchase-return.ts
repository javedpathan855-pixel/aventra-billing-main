export type PurchaseReturnStatus =
  | "DRAFT"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED";

export type ReturnDisposition = "RESTOCK" | "DAMAGED" | "QUARANTINE";

export type PurchaseReturnItem = {
  id: string;
  purchaseReturnId: string;
  productId: string | null;
  purchaseBillItemId: string | null;
  item: string;
  description: string | null;
  hsnSac: string | null;
  billedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  disposition: ReturnDisposition;
  reason: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseReturn = {
  id: string;
  organizationId: string;
  returnNumber: string;
  supplierId: string | null;
  supplierName: string;
  supplierEmail: string | null;
  supplierAddress: string | null;
  supplierGstin: string | null;
  supplierPlaceOfSupply: string | null;
  purchaseBillId: string | null;
  purchaseBillNumber?: string | null;
  purchaseOrderId: string | null;
  purchaseOrderNumber?: string | null;
  returnDate: string;
  reason: string;
  status: PurchaseReturnStatus;
  taxMode: "CGST_SGST" | "IGST";
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  terms: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseReturnItem[];
};

export type ReturnableBillItem = {
  id: string;
  productId: string | null;
  item: string;
  description: string | null;
  hsnSac: string | null;
  billedQuantity: number;
  previouslyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  unit?: string;
};

export type ReturnableBill = {
  id: string;
  billNumber: string;
  billDate: string;
  supplierId: string | null;
  supplierName: string;
  supplierEmail: string | null;
  supplierAddress: string | null;
  supplierGstin: string | null;
  supplierPlaceOfSupply: string | null;
  taxMode: "CGST_SGST" | "IGST";
  currency: string;
  items: ReturnableBillItem[];
};
