import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "../../domain/entities/purchase-order";

export type PurchaseOrderItemInputDto = {
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

export type CreatePurchaseOrderDto = {
  orderNumber?: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  orderDate: string; // ISO date YYYY-MM-DD
  expectedDeliveryDate?: string | null;
  referenceNumber?: string | null;
  taxMode?: "CGST_SGST" | "IGST";
  currency?: string;
  paymentTerms?: string | null;
  status?: PurchaseOrderStatus;
  notes?: string | null;
  terms?: string | null;
  additionalCharges?: number;
  additionalChargesLabel?: string | null;
  additionalDiscount?: number;
  additionalDiscountType?: "fixed" | "percentage";
  additionalDiscountLabel?: string | null;
  items: PurchaseOrderItemInputDto[];
};

export type UpdatePurchaseOrderDto = Partial<CreatePurchaseOrderDto>;

export type RecordReceivingItemDto = {
  id: string; // Line item ID
  receivedQuantity: number;
};

export type RecordReceivingDto = {
  items: RecordReceivingItemDto[];
};

export type PurchaseOrderActionResult<T = PurchaseOrder> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
