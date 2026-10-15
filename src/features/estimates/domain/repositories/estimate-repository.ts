import type { Estimate, EstimateStatus } from "../entities/estimate";

export type SaveEstimateItemInput = {
  id: string;
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

export type SaveEstimateDomainInput = {
  id: string;
  organizationId: string;
  estimateNumber: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  referenceNumber?: string | null;
  issueDate: Date;
  validUntil: Date;
  status: EstimateStatus;
  taxMode: string;
  currency: string;
  subtotal: number;
  lineDiscountTotal: number;
  additionalDiscount: number;
  additionalDiscountType: string;
  additionalDiscountLabel?: string | null;
  additionalCharges: number;
  additionalChargesLabel?: string | null;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  items: SaveEstimateItemInput[];
};

export type EstimateFilterCriteria = {
  status?: string;
  search?: string;
  customerId?: string;
};

export interface IEstimateRepository {
  findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<Estimate | null>;
  findByNumber(
    organizationId: string,
    estimateNumber: string,
    txClient?: unknown,
  ): Promise<Estimate | null>;
  findMany(
    organizationId: string,
    criteria?: EstimateFilterCriteria,
  ): Promise<Estimate[]>;
  create(
    data: SaveEstimateDomainInput,
    txClient?: unknown,
  ): Promise<Estimate>;
  update(
    organizationId: string,
    id: string,
    data: SaveEstimateDomainInput,
    txClient?: unknown,
  ): Promise<Estimate>;
  updateStatus(
    organizationId: string,
    id: string,
    status: EstimateStatus,
    extra?: { convertedToInvoiceId?: string; convertedAt?: Date },
    txClient?: unknown,
  ): Promise<Estimate>;
  delete(organizationId: string, id: string): Promise<number>;
}
