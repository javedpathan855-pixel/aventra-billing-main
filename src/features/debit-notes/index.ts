/**
 * Public cross-feature API of the debit-notes feature.
 *
 * Other features and the route layer consume debit-note reads and mutations
 * through this module only — never via `debit-notes/domain/*` or
 * `debit-notes/infrastructure/*` deep imports. Everything else under
 * `features/debit-notes/*` is a private internal of the feature.
 */
export { getDebitNotes } from "./data/queries/get-debit-notes";
export { getDebitNoteById } from "./data/queries/get-debit-note-by-id";
export { getEligibleInvoicesForDebit } from "./data/queries/get-eligible-invoices-for-debit";
export {
  createDebitNoteAction,
  updateDebitNoteAction,
  issueDebitNoteAction,
  deleteDebitNoteAction,
} from "./data/mutations/debit-note-mutations";
export type {
  CreateDebitNoteInputDto,
  DebitNoteActionResult,
  DebitNoteLineItemInputDto,
  EligibleInvoiceForDebitDto,
  UpdateDebitNoteInputDto,
} from "./data/dto/debit-note-dto";
