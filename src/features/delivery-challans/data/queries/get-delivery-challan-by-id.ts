import "server-only";

import { resolveDeliveryChallanContext } from "../context/delivery-challan-context";
import { deliveryChallanRepository } from "../../infrastructure/repositories/prisma-delivery-challan-repository";
import type { DeliveryChallan } from "../../domain/entities/delivery-challan";

export const getDeliveryChallanById = async (
  id: string,
): Promise<DeliveryChallan | null> => {
  const { organizationId } = await resolveDeliveryChallanContext();
  return deliveryChallanRepository.findById(id, organizationId);
};
