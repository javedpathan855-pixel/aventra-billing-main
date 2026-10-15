import "server-only";

import { resolveDeliveryChallanContext } from "../context/delivery-challan-context";
import { deliveryChallanRepository } from "../../infrastructure/repositories/prisma-delivery-challan-repository";
import type { DeliveryChallan } from "../../domain/entities/delivery-challan";
import type { DeliveryChallanFilter } from "../../domain/repositories/delivery-challan-repository";

export const getDeliveryChallans = async (
  filter?: DeliveryChallanFilter,
): Promise<DeliveryChallan[]> => {
  const { organizationId } = await resolveDeliveryChallanContext();
  return deliveryChallanRepository.findMany(organizationId, filter);
};
