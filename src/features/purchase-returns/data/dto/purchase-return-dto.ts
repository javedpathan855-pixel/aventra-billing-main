import type {
  PurchaseReturn,
  PurchaseReturnStatus,
  ReturnDisposition,
} from "../../domain/entities/purchase-return";

export type CreatePurchaseReturnItemInputDto = {
  productId?: string | null;
  purchaseBillItemId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  billedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  disposition?: ReturnDisposition;
  reason?: string | null;
  sortOrder?: number;
};

export type CreatePurchaseReturnInputDto = {
  returnNumber?: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  purchaseBillId?: string | null;
  purchaseOrderId?: string | null;
  returnDate: string; // ISO date YYYY-MM-DD
  reason: string;
  taxMode?: "CGST_SGST" | "IGST";
  currency?: string;
  notes?: string | null;
  terms?: string | null;
  items: CreatePurchaseReturnItemInputDto[];
};

export type UpdatePurchaseReturnStatusInputDto = {
  status: PurchaseReturnStatus;
};

export type PurchaseReturnActionResult<T = PurchaseReturn> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
