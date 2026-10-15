/**
 * Public cross-feature API of the delivery-challans feature.
 */
export type {
  DeliveryChallan,
  DeliveryChallanItem,
  DeliveryChallanStatus,
  DeliverableSalesOrder,
  DeliverableSalesOrderItem,
} from "./domain/entities/delivery-challan";

export type {
  CreateDeliveryChallanInput,
  DeliveryChallanFilter,
  IDeliveryChallanRepository,
} from "./domain/repositories/delivery-challan-repository";

export {
  calculateRemainingDeliverableQuantity,
  assertDeliverableQuantity,
  deriveSalesOrderFulfilmentStatus,
} from "./domain/rules/delivery-challan-rules";

export { deliveryChallanRepository } from "./infrastructure/repositories/prisma-delivery-challan-repository";
export { getDeliveryChallans } from "./data/queries/get-delivery-challans";
export { getDeliveryChallanById } from "./data/queries/get-delivery-challan-by-id";
export {
  getDeliverableSalesOrders,
  getDeliverableSalesOrderById,
} from "./data/queries/get-deliverable-sales-orders";
export { createDeliveryChallanAction } from "./data/mutations/create-delivery-challan";
export { updateDeliveryChallanStatusAction } from "./data/mutations/update-delivery-challan-status";
export { deleteDeliveryChallanAction } from "./data/mutations/delete-delivery-challan";

export { DeliveryChallanListPage } from "./presentation/page/DeliveryChallanListPage";
export { DeliveryChallanCreatePage } from "./presentation/page/DeliveryChallanCreatePage";
export { DeliveryChallanDetailPage } from "./presentation/page/DeliveryChallanDetailPage";
export { DeliveryChallanStatusBadge } from "./presentation/components/DeliveryChallanStatusBadge";
export { DeliveryChallanDocument } from "./presentation/components/DeliveryChallanDocument";
