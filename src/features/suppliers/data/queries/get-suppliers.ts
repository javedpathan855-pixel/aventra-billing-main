import "server-only";

import { resolveSupplierContext } from "../context/supplier-context";
import { supplierRepository } from "../../infrastructure/repositories/prisma-supplier-repository";
import { toSupplierDto } from "../mappers/supplier-mappers";
import type { SupplierDto, SupplierFilterInput } from "../dto/supplier-dto";

export type GetSuppliersResult = {
  suppliers: SupplierDto[];
  totalCount: number;
};

export const getSuppliers = async (
  filter?: SupplierFilterInput,
): Promise<GetSuppliersResult> => {
  const { organizationId } = await resolveSupplierContext();

  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const result = await supplierRepository.list(organizationId, {
    query: filter?.query,
    status: filter?.status,
    limit: pageSize,
    offset,
  });

  return {
    suppliers: result.suppliers.map(toSupplierDto),
    totalCount: result.totalCount,
  };
};
