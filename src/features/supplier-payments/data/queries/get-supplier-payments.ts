import "server-only";

import { resolveSupplierPaymentContext } from "../context/supplier-payment-context";
import { supplierPaymentRepository } from "../../infrastructure/repositories/prisma-supplier-payment-repository";
import type {
  ListSupplierPaymentsFilters,
  ListSupplierPaymentsResult,
} from "../../domain/repositories/supplier-payment-repository";
import type { SupplierPayment } from "../../domain/supplier-payment";

export const getSupplierPayments = async (
  filters?: ListSupplierPaymentsFilters,
): Promise<ListSupplierPaymentsResult> => {
  const { organizationId } = await resolveSupplierPaymentContext();
  return supplierPaymentRepository.listWithFilters(organizationId, filters);
};

export const getSupplierPaymentById = async (
  id: string,
): Promise<SupplierPayment | null> => {
  const { organizationId } = await resolveSupplierPaymentContext();
  return supplierPaymentRepository.findById(organizationId, id);
};

export const getSupplierPaymentsForBill = async (
  purchaseBillId: string,
): Promise<SupplierPayment[]> => {
  const { organizationId } = await resolveSupplierPaymentContext();
  return supplierPaymentRepository.findByBillId(organizationId, purchaseBillId);
};
