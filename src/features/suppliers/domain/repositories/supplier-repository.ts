import type { Supplier, SupplierListFilter, SupplierStatus } from "../entities/supplier";

export type SupplierListResult = {
  suppliers: Supplier[];
  totalCount: number;
};

export type ISupplierRepository = {
  findById(organizationId: string, id: string): Promise<Supplier | null>;
  findByGstin(organizationId: string, gstin: string): Promise<Supplier | null>;
  list(organizationId: string, filter?: SupplierListFilter): Promise<SupplierListResult>;
  create(supplier: Supplier): Promise<Supplier>;
  update(organizationId: string, id: string, updates: Partial<Supplier>): Promise<Supplier>;
  updateStatus(organizationId: string, id: string, status: SupplierStatus): Promise<Supplier>;
  delete(organizationId: string, id: string): Promise<void>;
};
