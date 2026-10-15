/**
 * Public cross-feature API of the supplier-payments feature.
 */
export type {
  SupplierPayment,
  SupplierPaymentAllocationLine,
  SupplierPaymentMethod,
  SupplierPaymentStatus,
} from "./domain/supplier-payment";

export {
  SUPPLIER_PAYMENT_METHODS,
  allocatedTotal,
  unallocatedTotal,
  canReverseSupplierPayment,
  validateSupplierPaymentAllocations,
  roundCurrency,
  formatCurrency,
} from "./domain/supplier-payment";

export type {
  ISupplierPaymentRepository,
  ListSupplierPaymentsFilters,
  ListSupplierPaymentsResult,
  SaveSupplierPaymentDomainInput,
  SaveSupplierPaymentAllocationInput,
} from "./domain/repositories/supplier-payment-repository";

export {
  isBillEligibleForPayment,
  calculateAllocationAvailability,
  getTodayDateString,
} from "./domain/rules/supplier-payment-rules";

export {
  SupplierPaymentDomainError,
  SupplierPaymentNotFoundError,
  SupplierPaymentTotalMismatchError,
  ExceededBillBalanceError,
  IneligibleBillForPaymentError,
  SupplierMismatchError,
  InvalidSupplierPaymentStatusTransitionError,
  UnauthorizedSupplierPaymentAccessError,
} from "./domain/errors/supplier-payment-errors";

export { supplierPaymentRepository } from "./infrastructure/repositories/prisma-supplier-payment-repository";
export {
  getSupplierPayments,
  getSupplierPaymentById,
  getSupplierPaymentsForBill,
} from "./data/queries/get-supplier-payments";
export { getPayableBills } from "./data/queries/get-payable-bills";
export type { PayableBillOption } from "./data/queries/get-payable-bills";

export {
  recordSupplierPaymentAction,
  reverseSupplierPaymentAction,
} from "./data/mutations/supplier-payment-mutations";

export { SupplierPaymentCreatePage } from "./presentation/page/SupplierPaymentCreatePage";
export { SupplierPaymentListPage } from "./presentation/page/SupplierPaymentListPage";
export { SupplierPaymentDetailPage } from "./presentation/page/SupplierPaymentDetailPage";
