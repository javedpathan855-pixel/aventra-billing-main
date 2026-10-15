/**
 * Public cross-feature API of the estimates feature.
 */
export type {
  Estimate,
  EstimateLineItem,
  EstimateStatus,
  EstimateTotals,
  TaxMode,
} from "./domain/entities/estimate";

export type {
  IEstimateRepository,
  EstimateFilterCriteria,
  SaveEstimateDomainInput,
  SaveEstimateItemInput,
} from "./domain/repositories/estimate-repository";

export {
  calculateEstimateTotals,
  calculateValidUntilDate,
  formatCurrency,
  formatEstimateDate,
  getTodayDateString,
  lineTax,
  lineTaxable,
  resolveEstimateDisplayStatus,
  roundCurrency,
  validateEstimate,
} from "./domain/rules/estimate-rules";

export {
  canAcceptEstimate,
  canCancelEstimate,
  canConvertToInvoice,
  canDeleteEstimate,
  canEditEstimate,
  canRejectEstimate,
  canReopenEstimate,
  canSendEstimate,
} from "./domain/rules/estimate-lifecycle-rules";

export {
  EstimateDomainError,
  EstimateImmutableError,
  EstimateNotFoundError,
  DuplicateEstimateNumberError,
  InvalidCustomerReferenceError,
  InvalidProductReferenceError,
  InvalidEstimateStatusTransitionError,
  UnauthorizedEstimateAccessError,
} from "./domain/errors/estimate-errors";

export { estimateRepository } from "./infrastructure/repositories/prisma-estimate-repository";
export { getEstimates } from "./data/queries/get-estimates";
export { getEstimateById } from "./data/queries/get-estimate-by-id";

export {
  createEstimateAction,
  updateEstimateAction,
  transitionEstimateStatusAction,
  deleteEstimateAction,
  convertEstimateToInvoiceAction,
} from "./data/mutations/estimate-mutations";

export { EstimateCreatePage } from "./presentation/page/EstimateCreatePage";
export { EstimateListPage } from "./presentation/page/EstimateListPage";
export { EstimateDetailPage } from "./presentation/page/EstimateDetailPage";
export { EstimateDocument } from "./presentation/components/EstimateDocument";
