/**
 * Public cross-feature API of the sales-returns feature.
 */
export type {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatus,
  ReturnDisposition,
  ReturnableInvoice,
  ReturnableInvoiceItem,
} from "./domain/entities/sales-return";

export type {
  CreateSalesReturnInput,
  SalesReturnFilter,
  ISalesReturnRepository,
} from "./domain/repositories/sales-return-repository";

export {
  calculateRemainingReturnableQuantity,
  assertReturnableQuantity,
  calculateReturnTotals,
  calculateReturnLineTotals,
} from "./domain/rules/sales-return-rules";

export { salesReturnRepository } from "./infrastructure/repositories/prisma-sales-return-repository";
export { getSalesReturns } from "./data/queries/get-sales-returns";
export { getSalesReturnById } from "./data/queries/get-sales-return-by-id";
export {
  getReturnableInvoices,
  getReturnableInvoiceById,
} from "./data/queries/get-returnable-invoices";
export { createSalesReturnAction } from "./data/mutations/create-sales-return";
export { updateSalesReturnStatusAction } from "./data/mutations/update-sales-return-status";
export { deleteSalesReturnAction } from "./data/mutations/delete-sales-return";

export { SalesReturnListPage } from "./presentation/page/SalesReturnListPage";
export { SalesReturnCreatePage } from "./presentation/page/SalesReturnCreatePage";
export { SalesReturnDetailPage } from "./presentation/page/SalesReturnDetailPage";
export { SalesReturnStatusBadge } from "./presentation/components/SalesReturnStatusBadge";
export { SalesReturnDocument } from "./presentation/components/SalesReturnDocument";
