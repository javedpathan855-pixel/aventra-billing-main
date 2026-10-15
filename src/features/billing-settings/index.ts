/**
 * Public cross-feature API of the billing-settings feature (DEF-010).
 *
 * Other features consume document-number allocation and settings reads
 * through this module only — never via `billing-settings/infrastructure/*`
 * deep imports. Unlike the previous `export *` barrel, internal mappers and
 * repository implementations stay private; only the repository contract's
 * shared singleton and the domain rules needed by callers are public.
 */
export type { BillingDocumentType } from "./domain/entities/billing-settings";
export type { AllocatedDocumentNumber } from "./domain/repositories/billing-settings-repository";
export { billingSettingsRepository } from "./infrastructure/repositories/prisma-billing-settings-repository";
export {
  DEFAULT_DOCUMENT_CONFIGS,
  formatDocumentNumber,
} from "./domain/rules/billing-settings-rules";
export { getBillingSettings } from "./data/queries/get-billing-settings";
