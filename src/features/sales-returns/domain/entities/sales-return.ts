export type SalesReturnStatus =
  | "DRAFT"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED";

export type ReturnDisposition = "RESTOCK" | "DAMAGED" | "QUARANTINE";

export type SalesReturnItem = {
  id: string;
  salesReturnId: string;
  productId: string | null;
  invoiceItemId: string | null;
  item: string;
  description: string | null;
  hsnSac: string | null;
  soldQuantity: number;
  returnQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  disposition: ReturnDisposition;
  reason: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SalesReturn = {
  id: string;
  organizationId: string;
  returnNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerGstin: string | null;
  customerPlaceOfSupply: string | null;
  invoiceId: string | null;
  invoiceNumber?: string | null;
  salesOrderId: string | null;
  salesOrderNumber?: string | null;
  creditNoteId: string | null;
  creditNoteNumber?: string | null;
  returnDate: Date;
  reason: string;
  status: SalesReturnStatus;
  taxMode: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: SalesReturnItem[];
};

export type ReturnableInvoiceItem = {
  id: string;
  productId: string | null;
  item: string;
  description: string | null;
  hsnSac: string | null;
  soldQuantity: number;
  previouslyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  unit?: string;
};

export type ReturnableInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  customerGstin: string | null;
  customerPlaceOfSupply: string | null;
  taxMode: string;
  currency: string;
  items: ReturnableInvoiceItem[];
};
