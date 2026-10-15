import "server-only";

import { resolvePaymentContext } from "../context/payment-context";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import { isInvoiceEligibleForPayment } from "../../domain/rules/payment-rules";
import { roundCurrency } from "../../domain/payment";
import { calculateInvoiceTotals } from "@/features/invoices";

export type PayableInvoiceOption = {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  status: string;
  total: number;
  remainingBalance: number;
};

/**
 * Lists invoices eligible for payment allocation: billable statuses with a
 * positive remaining balance after legacy cash, active allocations, issued
 * credits, and issued debits. Drafts and cancelled invoices are excluded.
 */
export const getPayableInvoices = async (options?: {
  customerId?: string;
  includeInvoiceId?: string;
}): Promise<PayableInvoiceOption[]> => {
  const { organizationId } = await resolvePaymentContext();
  const allInvoices = await invoiceRepository.findMany(organizationId);

  const results: PayableInvoiceOption[] = [];
  for (const invoice of allInvoices) {
    if (!isInvoiceEligibleForPayment(invoice.status)) {
      continue;
    }
    if (options?.customerId && invoice.customerId !== options.customerId) {
      continue;
    }
    const totals = calculateInvoiceTotals(invoice);
    const remaining = roundCurrency(
      Math.max(
        0,
        totals.total -
          roundCurrency(invoice.amountPaid) -
          roundCurrency(invoice.allocatedCash ?? 0) -
          roundCurrency(totals.creditedAmount ?? 0) +
          roundCurrency(totals.debitedAmount ?? 0),
      ),
    );
    if (remaining <= 0 && options?.includeInvoiceId !== invoice.id) {
      continue;
    }
    results.push({
      id: invoice.id,
      invoiceNumber: invoice.number,
      customerId: invoice.customerId,
      customerName: invoice.customer,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      total: totals.total,
      remainingBalance: remaining,
    });
  }

  return results;
};
