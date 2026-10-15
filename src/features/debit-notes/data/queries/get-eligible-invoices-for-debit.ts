import "server-only";

import { resolveDebitNoteContext } from "../context/debit-note-context";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import { debitNoteRepository } from "../../infrastructure/repositories/prisma-debit-note-repository";
import { isInvoiceEligibleForDebit } from "../../domain/rules/debit-calculation-rules";
import { roundCurrency } from "../../domain/debit-note";
import { calculateInvoiceTotals } from "@/features/invoices";
import type { EligibleInvoiceForDebitDto } from "../dto/debit-note-dto";

export const getEligibleInvoicesForDebit = async (
  options?: { includeInvoiceId?: string },
): Promise<EligibleInvoiceForDebitDto[]> => {
  const { organizationId } = await resolveDebitNoteContext();
  const allInvoices = await invoiceRepository.findMany(organizationId);

  // Filter to eligible statuses (not Draft, not Cancelled)
  const eligibleInvoices = allInvoices.filter((inv) =>
    isInvoiceEligibleForDebit(inv.status),
  );

  const results: EligibleInvoiceForDebitDto[] = [];

  for (const inv of eligibleInvoices) {
    const debitedTotal = await debitNoteRepository.getIssuedTotalForInvoice(
      organizationId,
      inv.id,
    );

    const invTotals = calculateInvoiceTotals(inv);
    const remaining = roundCurrency(Math.max(0, invTotals.total - debitedTotal));

    if (remaining <= 0 && options?.includeInvoiceId !== inv.id) {
      continue;
    }

    results.push({
      id: inv.id,
      invoiceNumber: inv.number,
      customerId: inv.customerId,
      customerName: inv.customer,
      customerEmail: inv.customerEmail,
      customerAddress: inv.customerAddress,
      customerGstin: inv.customerGstin,
      customerPlaceOfSupply: inv.customerPlaceOfSupply,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: inv.status,
      taxMode: inv.taxMode,
      total: invTotals.total,
      debitedTotal,
      remainingDebitableAmount: remaining,
      items: inv.items.map((it) => ({
        id: it.id,
        item: it.item,
        description: it.description,
        hsnSac: it.hsnSac,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        lineTotal: roundCurrency(
          it.quantity * it.unitPrice * (1 - it.discount / 100) * (1 + it.taxRate / 100),
        ),
      })),
    });
  }

  return results;
};
