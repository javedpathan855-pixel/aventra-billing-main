/**
 * Public cross-feature API of the products feature (client-safe).
 *
 * This barrel intentionally exposes ONLY pure DTO/domain types so client
 * components can consume it without pulling server-only modules
 * (`server-only`, Prisma) into browser bundles. Server-side consumers that
 * need repositories or mutations continue to use the feature's internal
 * modules directly; those remain private by design.
 */
export type { ProductDto } from "./data/dto/product-dto";
