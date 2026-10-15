import "server-only";

import { resolveSalesReturnContext } from "../context/sales-return-context";
import { salesReturnRepository } from "../../infrastructure/repositories/prisma-sales-return-repository";
import type { ReturnableInvoice } from "../../domain/entities/sales-return";

export const getReturnableInvoices = async (): Promise<ReturnableInvoice[]> => {
  const { organizationId } = await resolveSalesReturnContext();
  return salesReturnRepository.getReturnableInvoices(organizationId);
};

export const getReturnableInvoiceById = async (
  invoiceId: string,
): Promise<ReturnableInvoice | null> => {
  const { organizationId } = await resolveSalesReturnContext();
  return salesReturnRepository.getReturnableInvoiceById(invoiceId, organizationId);
};
