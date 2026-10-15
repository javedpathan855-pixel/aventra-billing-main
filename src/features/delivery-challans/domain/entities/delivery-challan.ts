export type DeliveryChallanStatus =
  | "DRAFT"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export type DeliveryChallanItem = {
  id: string;
  challanId: string;
  salesOrderItemId: string | null;
  productId: string | null;
  item: string;
  description: string | null;
  hsnSac: string | null;
  unit: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DeliveryChallan = {
  id: string;
  organizationId: string;
  challanNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerGstin: string | null;
  salesOrderId: string | null;
  salesOrderNumber?: string | null;
  invoiceId: string | null;
  invoiceNumber?: string | null;
  challanDate: Date;
  dispatchDate: Date | null;
  deliveryDate: Date | null;
  status: DeliveryChallanStatus;
  deliveryAddress: string | null;
  transporterName: string | null;
  vehicleNumber: string | null;
  trackingNumber: string | null;
  transportMode: string | null;
  deliveryReason: string;
  recipientName: string | null;
  recipientPhone: string | null;
  notes: string | null;
  terms: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: DeliveryChallanItem[];
};

export type DeliverableSalesOrderItem = {
  id: string;
  item: string;
  description: string | null;
  hsnSac: string | null;
  unit: string;
  orderedQuantity: number;
  previouslyDeliveredQuantity: number;
  remainingDeliverableQuantity: number;
  productId: string | null;
};

export type DeliverableSalesOrder = {
  id: string;
  orderNumber: string;
  orderDate: Date;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerGstin: string | null;
  status: string;
  items: DeliverableSalesOrderItem[];
};
