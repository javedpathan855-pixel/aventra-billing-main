import "server-only";

import { resolveSupplierContext } from "../context/supplier-context";
import { supplierRepository } from "../../infrastructure/repositories/prisma-supplier-repository";
import { toSupplierDto } from "../mappers/supplier-mappers";
import type { SupplierDto } from "../dto/supplier-dto";

export const getSupplier = async (id: string): Promise<SupplierDto | null> => {
  const { organizationId } = await resolveSupplierContext();
  const supplier = await supplierRepository.findById(organizationId, id);

  if (!supplier) return null;
  return toSupplierDto(supplier);
};
