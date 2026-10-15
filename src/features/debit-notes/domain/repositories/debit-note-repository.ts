import type { DebitNote, DebitNoteStatus, TaxMode } from "../debit-note";

export type DebitNoteFilterCriteria = {
  query?: string;
  status?: DebitNoteStatus;
  customerId?: string;
  invoiceId?: string;
  startDate?: string;
  endDate?: string;
};

export type SaveDebitNoteLineItemInput = {
  id: string;
  invoiceItemId?: string | null;
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
};

export type SaveDebitNoteDomainInput = {
  id: string;
  organizationId: string;
  debitNoteNumber: string;
  invoiceId: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  issueDate: Date;
  status: DebitNoteStatus;
  reason: string;
  taxMode: TaxMode;
  currency?: string;
  subtotal: number;
  lineDiscountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  items: SaveDebitNoteLineItemInput[];
};

export type IDebitNoteRepository = {
  findById(organizationId: string, id: string): Promise<DebitNote | null>;
  findByNumber(organizationId: string, debitNoteNumber: string): Promise<DebitNote | null>;
  findMany(organizationId: string, criteria?: DebitNoteFilterCriteria): Promise<DebitNote[]>;
  findByInvoiceId(organizationId: string, invoiceId: string): Promise<DebitNote[]>;
  getIssuedTotalForInvoice(
    organizationId: string,
    invoiceId: string,
    excludeDebitNoteId?: string,
    txClient?: unknown,
  ): Promise<number>;
  create(input: SaveDebitNoteDomainInput, txClient?: unknown): Promise<DebitNote>;
  update(
    organizationId: string,
    id: string,
    input: SaveDebitNoteDomainInput,
    txClient?: unknown,
  ): Promise<DebitNote>;
  delete(organizationId: string, id: string): Promise<number>;
};
