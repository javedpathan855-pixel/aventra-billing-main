/**
 * Public cross-feature API of the payments feature.
 *
 * Other features and the route layer consume payment reads and mutations
 * through this module only — never via `payments/domain/*` or
 * `payments/infrastructure/*` deep imports. Everything else under
 * `features/payments/*` is a private internal of the feature.
 */
export { getPayments, getPaymentById, getPaymentsForInvoice } from "./data/queries/get-payments";
export {
  recordPaymentAction,
  reversePaymentAction,
} from "./data/mutations/payment-mutations";
export type {
  PaymentActionResult,
  PaymentAllocationInputDto,
  RecordPaymentInputDto,
  ReversePaymentInputDto,
} from "./data/dto/payment-dto";
