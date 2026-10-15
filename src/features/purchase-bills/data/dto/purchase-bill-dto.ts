import type {
  PurchaseBill,
  PurchaseBillStatus,
} from "../../domain/entities/purchase-bill";

export type PurchaseBillItemInputDto = {
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
};

export type CreatePurchaseBillDto = {
  billNumber?: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  supplierInvoiceNumber?: string | null;
  supplierInvoiceDate?: string | null;
  purchaseOrderId?: string | null;
  billDate: string; // ISO date YYYY-MM-DD
  dueDate: string; // ISO date YYYY-MM-DD
  taxMode?: "CGST_SGST" | "IGST";
  currency?: string;
  paymentTerms?: string | null;
  status?: PurchaseBillStatus;
  notes?: string | null;
  terms?: string | null;
  additionalCharges?: number;
  additionalChargesLabel?: string | null;
  additionalDiscount?: number;
  additionalDiscountType?: "fixed" | "percentage";
  additionalDiscountLabel?: string | null;
  items: PurchaseBillItemInputDto[];
};

export type UpdatePurchaseBillDto = Partial<CreatePurchaseBillDto>;

export type PurchaseBillActionResult<T = PurchaseBill> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
