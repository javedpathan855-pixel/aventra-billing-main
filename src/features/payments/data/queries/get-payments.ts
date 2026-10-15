import "server-only";

import { resolvePaymentContext } from "../context/payment-context";
import { paymentRepository } from "../../infrastructure/repositories/prisma-payment-repository";
import type { Payment } from "../../domain/payment";
import type { PaymentFilterCriteria } from "../../domain/repositories/payment-repository";

export const getPayments = async (
  criteria?: PaymentFilterCriteria,
): Promise<{ payments: Payment[] }> => {
  const { organizationId } = await resolvePaymentContext();
  const payments = await paymentRepository.findMany(organizationId, criteria);
  return { payments };
};

export const getPaymentById = async (id: string): Promise<Payment | null> => {
  const { organizationId } = await resolvePaymentContext();
  return await paymentRepository.findById(organizationId, id);
};

export const getPaymentsForInvoice = async (invoiceId: string): Promise<Payment[]> => {
  const { organizationId } = await resolvePaymentContext();
  return await paymentRepository.findByInvoiceId(organizationId, invoiceId);
};
