import "server-only";

import { resolveSupplierPaymentContext } from "../context/supplier-payment-context";
import { purchaseBillRepository } from "@/features/purchase-bills/infrastructure/repositories/prisma-purchase-bill-repository";
import { supplierPaymentRepository } from "../../infrastructure/repositories/prisma-supplier-payment-repository";
import { roundCurrency } from "../../domain/supplier-payment";

export type PayableBillOption = {
  id: string;
  billNumber: string;
  supplierId?: string | null;
  supplierName: string;
  billDate: string;
  dueDate: string;
  status: string;
  total: number;
  remainingBalance: number;
};

/**
 * Purchase bills eligible for payment: posted (Confirmed) bills with a
 * positive outstanding balance (total minus active allocations). Draft and
 * Cancelled bills are never payable.
 */
export const getPayableBills = async (options?: {
  supplierId?: string;
  includeBillId?: string;
}): Promise<PayableBillOption[]> => {
  const { organizationId } = await resolveSupplierPaymentContext();

  const { bills } = await purchaseBillRepository.listWithFilters(
    organizationId,
    {
      ...(options?.supplierId ? { supplierId: options.supplierId } : {}),
      page: 1,
      pageSize: 100,
    },
  );

  const payable: PayableBillOption[] = [];

  for (const bill of bills) {
    if (bill.status !== "Confirmed") {
      continue;
    }
    if (options?.supplierId && bill.supplierId !== options.supplierId) {
      continue;
    }

    const allocated =
      await supplierPaymentRepository.getActiveAllocatedTotalForBill(
        organizationId,
        bill.id,
      );
    const remaining = roundCurrency(Math.max(0, bill.total - allocated));

    if (remaining <= 0 && bill.id !== options?.includeBillId) {
      continue;
    }

    payable.push({
      id: bill.id,
      billNumber: bill.billNumber,
      supplierId: bill.supplierId,
      supplierName: bill.supplierName,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      status: bill.status,
      total: bill.total,
      remainingBalance: remaining,
    });
  }

  return payable;
};
