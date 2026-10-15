/**
 * Public cross-feature API of the customers feature (client-safe).
 *
 * This barrel intentionally exposes ONLY pure domain/DTO symbols so client
 * components can consume it without pulling server-only modules
 * (`server-only`, Prisma) into browser bundles. Server-side consumers that
 * need `customerRepository` or customer mutations continue to use the
 * feature's internal modules directly; those remain private by design.
 */
export type { CustomerDto } from "./data/dto/customer-dto";
export { formatCustomerAddress } from "./domain/entities/customer";
export type {
  CustomerAddress,
  CustomerStatus,
  CustomerType,
  GstTreatment,
} from "./domain/entities/customer";
