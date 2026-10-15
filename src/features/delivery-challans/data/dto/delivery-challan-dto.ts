import type {
  DeliveryChallan,
  DeliveryChallanStatus,
} from "../../domain/entities/delivery-challan";

export type DeliveryChallanItemInputDto = {
  salesOrderItemId?: string | null;
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  unit: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  sortOrder?: number;
};

export type CreateDeliveryChallanInputDto = {
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  salesOrderId?: string | null;
  invoiceId?: string | null;
  challanDate: string; // ISO date string
  dispatchDate?: string | null;
  deliveryDate?: string | null;
  deliveryAddress?: string | null;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  trackingNumber?: string | null;
  transportMode?: string | null;
  deliveryReason?: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  notes?: string | null;
  terms?: string | null;
  items: DeliveryChallanItemInputDto[];
};

export type UpdateDeliveryChallanStatusInputDto = {
  status: DeliveryChallanStatus;
  dispatchDate?: string | null;
  deliveryDate?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
};

export type DeliveryChallanActionResult<T = DeliveryChallan> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
