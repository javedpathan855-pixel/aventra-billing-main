import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "../payment";

export type PaymentFilterOptions = {
  query?: string;
  status?: PaymentStatus | "All";
  method?: PaymentMethod | "All";
  customer?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  sortBy?: "paymentDate-desc" | "paymentDate-asc" | "amount-desc" | "amount-asc";
};

export const filterPayments = (
  payments: Payment[],
  options: PaymentFilterOptions = {},
): Payment[] => {
  const normalized = (options.query ?? "").trim().toLowerCase();
  const targetStatus = options.status ?? "All";
  const targetMethod = options.method ?? "All";
  const targetCustomer =
    options.customer && options.customer !== "All" ? options.customer.toLowerCase() : "";
  const dateFrom = options.issueDateFrom ?? "";
  const dateTo = options.issueDateTo ?? "";
  const sortBy = options.sortBy ?? "paymentDate-desc";

  const filtered = payments.filter((payment) => {
    if (normalized) {
      const matchCustomer = payment.customerName.toLowerCase().includes(normalized);
      const matchReference = (payment.reference ?? "").toLowerCase().includes(normalized);
      const matchNotes = (payment.notes ?? "").toLowerCase().includes(normalized);
      if (!matchCustomer && !matchReference && !matchNotes) return false;
    }
    if (targetStatus !== "All" && payment.status !== targetStatus) {
      return false;
    }
    if (targetMethod !== "All" && payment.method !== targetMethod) {
      return false;
    }
    if (targetCustomer && payment.customerName.toLowerCase() !== targetCustomer) {
      return false;
    }
    if (dateFrom && payment.paymentDate < dateFrom) return false;
    if (dateTo && payment.paymentDate > dateTo) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    switch (sortBy) {
      case "paymentDate-asc":
        return a.paymentDate.localeCompare(b.paymentDate);
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "paymentDate-desc":
      default:
        return b.paymentDate.localeCompare(a.paymentDate);
    }
  });
};

export type PaymentSummary = {
  totalPayments: number;
  totalReceived: number;
  activeCount: number;
  activeAmount: number;
  reversedCount: number;
};

export const summarizePayments = (payments: readonly Payment[]): PaymentSummary =>
  payments.reduce<PaymentSummary>(
    (summary, payment) => {
      summary.totalPayments += 1;
      if (payment.status === "Active") {
        summary.activeCount += 1;
        summary.activeAmount += payment.amount;
        summary.totalReceived += payment.amount;
      } else {
        summary.reversedCount += 1;
      }
      return summary;
    },
    {
      totalPayments: 0,
      totalReceived: 0,
      activeCount: 0,
      activeAmount: 0,
      reversedCount: 0,
    },
  );
