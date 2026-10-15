import {
  formatCurrency as sharedFormatCurrency,
  roundCurrency,
} from "@/shared/lib/money";
import type {
  Estimate,
  EstimateLineItem,
  EstimateStatus,
  EstimateTotals,
  TaxMode,
} from "../entities/estimate";

export { roundCurrency };

export const lineTaxable = (line: EstimateLineItem): number =>
  roundCurrency(line.quantity * line.unitPrice * (1 - line.discount / 100));

export const lineTax = (line: EstimateLineItem): number =>
  roundCurrency(lineTaxable(line) * (line.taxRate / 100));

/**
 * Calculates authoritative commercial estimate totals.
 * Header discounts reduce taxable base and scale GST distribution proportionally.
 */
export const calculateEstimateTotals = ({
  items,
  taxMode = "CGST_SGST",
  additionalCharges = 0,
  additionalDiscount = 0,
  additionalDiscountType = "fixed",
}: {
  items: EstimateLineItem[];
  taxMode?: TaxMode;
  additionalCharges?: number;
  additionalDiscount?: number;
  additionalDiscountType?: "percentage" | "fixed";
}): EstimateTotals => {
  const subtotal = roundCurrency(
    items.reduce((sum, line) => sum + roundCurrency(line.quantity * line.unitPrice), 0),
  );
  const lineDiscountTotal = roundCurrency(
    items.reduce(
      (sum, line) =>
        sum + roundCurrency(line.quantity * line.unitPrice * (line.discount / 100)),
      0,
    ),
  );
  const baseTaxable = roundCurrency(items.reduce((sum, line) => sum + lineTaxable(line), 0));

  let extraDiscount = 0;
  if (additionalDiscount && additionalDiscount > 0) {
    extraDiscount =
      additionalDiscountType === "percentage"
        ? roundCurrency(baseTaxable * (Math.min(100, additionalDiscount) / 100))
        : roundCurrency(Math.min(baseTaxable, additionalDiscount));
  }

  const discount = roundCurrency(lineDiscountTotal + extraDiscount);
  const taxable = roundCurrency(Math.max(0, baseTaxable - extraDiscount));

  const discountFactor = baseTaxable > 0 ? Math.min(1, extraDiscount / baseTaxable) : 0;
  const tax =
    discountFactor === 0
      ? roundCurrency(items.reduce((sum, line) => sum + lineTax(line), 0))
      : roundCurrency(
          items.reduce((sum, line) => {
            const discountedTaxable = roundCurrency(lineTaxable(line) * (1 - discountFactor));
            return sum + roundCurrency(discountedTaxable * (line.taxRate / 100));
          }, 0),
        );

  const extraCharges = roundCurrency(Math.max(0, additionalCharges ?? 0));
  const total = roundCurrency(Math.max(0, taxable + tax + extraCharges));

  const isIgst = taxMode === "IGST";
  const halfTax = roundCurrency(tax / 2);
  const otherHalf = roundCurrency(tax - halfTax);
  const cgst = isIgst ? 0 : halfTax;
  const sgst = isIgst ? 0 : otherHalf;
  const igst = isIgst ? tax : 0;

  const result: EstimateTotals = {
    subtotal,
    discount,
    taxable,
    tax,
    cgst,
    sgst,
    igst,
    total,
  };

  if (extraCharges > 0) {
    result.additionalCharges = extraCharges;
  }
  if (extraDiscount > 0) {
    result.additionalDiscount = extraDiscount;
  }

  return result;
};

export const formatCurrency = (value: number): string => sharedFormatCurrency(value);

export const formatEstimateDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? "Not supplied"
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateValidUntilDate = (
  issueDate: string,
  validityDays = 30,
): string => {
  if (!issueDate) return "";
  const parts = issueDate.split("-");
  if (parts.length !== 3) return issueDate;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return issueDate;
  }

  const date = new Date(year, month, day);
  date.setDate(date.getDate() + Math.max(1, validityDays));

  const resYear = date.getFullYear();
  const resMonth = String(date.getMonth() + 1).padStart(2, "0");
  const resDay = String(date.getDate()).padStart(2, "0");
  return `${resYear}-${resMonth}-${resDay}`;
};

/**
 * Resolves the display status for an estimate.
 * An active draft or sent quotation past its expiration date is presented as "Expired".
 * Accepted, Converted, Rejected, or Cancelled documents preserve their lifecycle status.
 */
export const resolveEstimateDisplayStatus = ({
  status,
  validUntil,
  today = getTodayDateString(),
}: {
  status: EstimateStatus;
  validUntil: string;
  today?: string;
}): EstimateStatus => {
  if (
    status === "Accepted" ||
    status === "Converted" ||
    status === "Rejected" ||
    status === "Cancelled"
  ) {
    return status;
  }

  if (validUntil && validUntil < today) {
    return "Expired";
  }

  return status;
};

export const validateEstimate = (
  estimate: Pick<Estimate, "customer" | "issueDate" | "validUntil" | "items">,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!estimate.customer || !estimate.customer.trim()) {
    errors.customer = "Select or enter a customer before saving.";
  }
  if (!estimate.issueDate) {
    errors.issueDate = "Quotation date is required.";
  }
  if (!estimate.validUntil) {
    errors.validUntil = "Valid until / expiration date is required.";
  }
  if (
    estimate.issueDate &&
    estimate.validUntil &&
    estimate.validUntil < estimate.issueDate
  ) {
    errors.validUntil = "Expiration date must be on or after quotation date.";
  }
  if (!estimate.items || estimate.items.length === 0) {
    errors.items = "Add at least one line item.";
  } else {
    estimate.items.forEach((line, index) => {
      if (!line.item || !line.item.trim()) {
        errors[`item-${index}`] = "Item or service description is required.";
      }
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        errors[`quantity-${index}`] = "Quantity must be greater than zero.";
      }
      if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
        errors[`price-${index}`] = "Enter a valid positive price.";
      }
      if (!Number.isFinite(line.discount) || line.discount < 0 || line.discount > 100) {
        errors[`discount-${index}`] = "Discount must be between 0% and 100%.";
      }
      if (!Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100) {
        errors[`tax-${index}`] = "Tax rate must be between 0% and 100%.";
      }
    });
  }
  return errors;
};
