import type {
  DeliveryChallan,
  DeliveryChallanStatus,
  DeliverableSalesOrder,
} from "../entities/delivery-challan";

export type DeliveryChallanFilter = {
  search?: string;
  status?: DeliveryChallanStatus;
  customerId?: string;
  salesOrderId?: string;
  startDate?: Date;
  endDate?: Date;
};

export type CreateDeliveryChallanItemInput = {
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

export type CreateDeliveryChallanInput = {
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  salesOrderId?: string | null;
  invoiceId?: string | null;
  challanDate: Date;
  dispatchDate?: Date | null;
  deliveryDate?: Date | null;
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
  items: CreateDeliveryChallanItemInput[];
};

export type UpdateDeliveryChallanStatusInput = {
  status: DeliveryChallanStatus;
  dispatchDate?: Date | null;
  deliveryDate?: Date | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
};

export interface IDeliveryChallanRepository {
  findMany(
    organizationId: string,
    filter?: DeliveryChallanFilter,
  ): Promise<DeliveryChallan[]>;
  findById(id: string, organizationId: string): Promise<DeliveryChallan | null>;
  create(
    organizationId: string,
    input: CreateDeliveryChallanInput,
  ): Promise<DeliveryChallan>;
  updateStatus(
    id: string,
    organizationId: string,
    input: UpdateDeliveryChallanStatusInput,
  ): Promise<DeliveryChallan>;
  delete(id: string, organizationId: string): Promise<boolean>;
  getDeliverableSalesOrders(
    organizationId: string,
  ): Promise<DeliverableSalesOrder[]>;
  getDeliverableSalesOrderById(
    salesOrderId: string,
    organizationId: string,
  ): Promise<DeliverableSalesOrder | null>;
}
