import type { DebitNoteStatus, TaxMode } from "../../domain/debit-note";

export type DebitNoteActionResult<T = unknown> =
  | {
      success: true;
      data: T;
      error?: never;
      fieldErrors?: never;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
      data?: never;
    };

export type DebitNoteLineItemInputDto = {
  id?: string;
  invoiceItemId?: string;
  productId?: string;
  item: string;
  description?: string;
  hsnSac?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type CreateDebitNoteInputDto = {
  invoiceId: string;
  debitNoteNumber?: string;
  issueDate: string;
  status?: DebitNoteStatus;
  reason: string;
  notes?: string;
  terms?: string;
  items: DebitNoteLineItemInputDto[];
};

export type UpdateDebitNoteInputDto = {
  id: string;
  debitNoteNumber?: string;
  issueDate: string;
  status?: DebitNoteStatus;
  reason: string;
  notes?: string;
  terms?: string;
  items: DebitNoteLineItemInputDto[];
};

export type EligibleInvoiceForDebitDto = {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  customerPlaceOfSupply?: string;
  issueDate: string;
  dueDate: string;
  status: string;
  taxMode: TaxMode;
  total: number;
  debitedTotal: number;
  remainingDebitableAmount: number;
  items: Array<{
    id: string;
    productId?: string;
    item: string;
    description?: string;
    hsnSac?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    lineTotal: number;
  }>;
};
