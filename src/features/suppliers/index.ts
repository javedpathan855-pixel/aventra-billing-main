/**
 * Public cross-feature API of the suppliers feature (client-safe).
 *
 * This barrel intentionally exposes ONLY pure domain/DTO symbols so client
 * components can consume it without pulling server-only modules
 * (`server-only`, Prisma) into browser bundles. Server-side consumers that
 * need `supplierRepository` or supplier mutations continue to use the
 * feature's internal modules directly; those remain private by design.
 */
export type { SupplierDto } from "./data/dto/supplier-dto";
export { formatSupplierAddress, getSupplierInitials } from "./domain/entities/supplier";
export type {
  Supplier,
  SupplierAddress,
  SupplierGstTreatment,
  SupplierListFilter,
  SupplierStatus,
} from "./domain/entities/supplier";
