/**
 * Public cross-feature API of the invoices feature (DEF-010).
 *
 * Other features (notably credit-notes) consume invoice money semantics
 * through this module only — never via `invoices/domain/*` or
 * `invoices/infrastructure/*` deep imports. Everything else under
 * `features/invoices/*` is a private internal of the feature.
 */
export {
  calculateDueDate,
  calculateInvoiceTotals,
  calculateRemainingReceivable,
  canCancelInvoice,
  canEditInvoice,
  deriveInvoicePaymentStatus,
  formatCurrency,
  formatInvoiceDate,
  getTodayDateString,
  lineDiscount,
  lineSubtotal,
  lineTax,
  lineTaxable,
  parsePaymentTermsDays,
  resolveInvoiceDisplayStatus,
  roundCurrency,
  validateInvoice,
} from "./domain/invoice";
export type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceTotals,
  ReceivableBreakdown,
  TaxMode,
} from "./domain/invoice";
export { determineTaxMode } from "./domain/rules/tax-rules";
