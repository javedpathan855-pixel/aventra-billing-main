/**
 * Purchase report row and metric types.
 *
 * Metric definitions (all organization-scoped; amounts in bill currency
 * units, rounded to 2dp by the aggregation layer):
 *
 * - Gross Purchases: sum of Confirmed purchase bill totals. Draft bills are
 *   not obligations yet; Cancelled bills are void. Neither is counted.
 * - Purchase Returns: sum of Completed purchase return totals. Draft,
 *   Approved, and Cancelled returns are not counted: only completed returns
 *   represent goods dispatched back to the supplier.
 * - Net Purchases: gross purchases minus completed returns.
 * - Input Tax / Returns Tax / Net Tax: the same inclusion rules applied to
 *   bill tax totals and return tax amounts.
 * - Outstanding: per confirmed bill, total minus active payment allocations.
 *   Returns do NOT reduce outstanding: no supplier credit-note model exists,
 *   so a return never auto-credits its bill.
 * - Payments: Active supplier payments only; Reversed payments are excluded
 *   everywhere they would otherwise count.
 */
export type PurchaseReportFilters = {
  from?: Date;
  to?: Date;
  supplierId?: string;
};

export type PurchaseSummaryMetrics = {
  billCount: number;
  grossPurchases: number;
  inputTax: number;
  returnCount: number;
  returnsTotal: number;
  returnsTax: number;
  netPurchases: number;
  netTax: number;
};

export type SupplierPurchaseRow = {
  supplierId: string | null;
  supplierName: string;
  billCount: number;
  grossPurchases: number;
  inputTax: number;
  returnsTotal: number;
  netPurchases: number;
  outstanding: number;
};

export type OutstandingBillRow = {
  billId: string;
  billNumber: string;
  supplierId: string | null;
  supplierName: string;
  billDate: string;
  dueDate: string;
  total: number;
  paidAmount: number;
  outstanding: number;
};

export type OutstandingPayables = {
  rows: OutstandingBillRow[];
  totalOutstanding: number;
  billCount: number;
  truncated: boolean;
};

export type PurchaseTaxSummary = {
  grossPurchases: number;
  cgst: number;
  sgst: number;
  igst: number;
  inputTax: number;
  returnsTotal: number;
  returnsTax: number;
  netPurchases: number;
  netTax: number;
};

export type PaymentMethodSummary = {
  method: string;
  paymentCount: number;
  totalPaid: number;
};

export type SupplierPaymentSummary = {
  supplierId: string | null;
  supplierName: string;
  paymentCount: number;
  totalPaid: number;
};

export type PaymentSummary = {
  paymentCount: number;
  totalPaid: number;
  byMethod: PaymentMethodSummary[];
  bySupplier: SupplierPaymentSummary[];
};

export type StatusCountSummary = {
  status: string;
  count: number;
  total: number;
};

export type OrderSummary = {
  rows: StatusCountSummary[];
  totalOrders: number;
  totalAmount: number;
};

export type ReturnSummary = {
  rows: StatusCountSummary[];
  returnCount: number;
  returnsTotal: number;
  returnsTax: number;
};

export type PurchaseReportsBundle = {
  summary: PurchaseSummaryMetrics;
  bySupplier: SupplierPurchaseRow[];
  outstanding: OutstandingPayables;
  tax: PurchaseTaxSummary;
  payments: PaymentSummary;
  orders: OrderSummary;
  returns: ReturnSummary;
};

/**
 * Outstanding balance of a single bill from authoritative figures.
 */
export const calculateBillOutstanding = (
  billTotal: number,
  activeAllocated: number,
): number =>
  Math.round((Math.max(0, billTotal - activeAllocated) + Number.EPSILON) * 100) /
  100;
