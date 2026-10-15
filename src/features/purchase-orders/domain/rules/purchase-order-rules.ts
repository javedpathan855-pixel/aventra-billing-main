import type {
  PurchaseOrderTotals,
  TaxBreakdownSlab,
} from "../entities/purchase-order";
import { InvalidPurchaseOrderLineError } from "../errors/purchase-order-errors";

const round2 = (val: number): number => Math.round((val + Number.EPSILON) * 100) / 100;
const round3 = (val: number): number => Math.round((val + Number.EPSILON) * 1000) / 1000;

export type CalculateTotalsParams = {
  items: Array<{
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    receivedQuantity?: number;
  }>;
  taxMode: "CGST_SGST" | "IGST";
  additionalCharges?: number;
  additionalDiscount?: number;
  additionalDiscountType?: "fixed" | "percentage";
};

/**
 * Pure domain calculation of purchase order financial totals, tax distribution,
 * and receiving progress. Uses the exact rounding and GST slab mechanics as
 * the Sales Order, Invoice, and Estimate modules.
 */
export const calculatePurchaseOrderTotals = ({
  items,
  taxMode,
  additionalCharges = 0,
  additionalDiscount = 0,
  additionalDiscountType = "fixed",
}: CalculateTotalsParams): PurchaseOrderTotals => {
  let grossSubtotal = 0;
  let lineDiscountTotal = 0;
  let totalOrderedQuantity = 0;
  let totalReceivedQuantity = 0;

  for (const it of items) {
    const qty = Math.max(0, it.quantity || 0);
    const price = Math.max(0, it.unitPrice || 0);
    const discPct = Math.min(100, Math.max(0, it.discount || 0));
    const received = Math.max(0, it.receivedQuantity || 0);

    const gross = qty * price;
    const disc = gross * (discPct / 100);

    grossSubtotal += gross;
    lineDiscountTotal += disc;
    totalOrderedQuantity += qty;
    totalReceivedQuantity += Math.min(qty, received);
  }

  grossSubtotal = round2(grossSubtotal);
  lineDiscountTotal = round2(lineDiscountTotal);

  const baseAfterLineDiscount = Math.max(0, grossSubtotal - lineDiscountTotal);

  let effectiveAdditionalDiscount = 0;
  if (additionalDiscountType === "percentage") {
    const pct = Math.min(100, Math.max(0, additionalDiscount));
    effectiveAdditionalDiscount = round2(baseAfterLineDiscount * (pct / 100));
  } else {
    effectiveAdditionalDiscount = round2(
      Math.min(baseAfterLineDiscount, Math.max(0, additionalDiscount)),
    );
  }

  const validAdditionalCharges = round2(Math.max(0, additionalCharges));

  const totalTaxable = round2(
    Math.max(
      0,
      baseAfterLineDiscount -
        effectiveAdditionalDiscount +
        validAdditionalCharges,
    ),
  );

  // Group by tax slab with proportional distribution of overall discount & charges
  const slabMap = new Map<number, { taxableAmount: number; taxAmount: number }>();

  for (const it of items) {
    const qty = Math.max(0, it.quantity || 0);
    const price = Math.max(0, it.unitPrice || 0);
    const discPct = Math.min(100, Math.max(0, it.discount || 0));
    const taxRate = Math.max(0, it.taxRate || 0);

    const lineGross = qty * price;
    const lineDisc = lineGross * (discPct / 100);
    const lineBase = Math.max(0, lineGross - lineDisc);

    let lineEffectiveTaxable = lineBase;
    if (baseAfterLineDiscount > 0) {
      const lineProportion = lineBase / baseAfterLineDiscount;
      const allocatedDocDisc = effectiveAdditionalDiscount * lineProportion;
      const allocatedCharges = validAdditionalCharges * lineProportion;
      lineEffectiveTaxable = Math.max(
        0,
        lineBase - allocatedDocDisc + allocatedCharges,
      );
    }

    const lineTax = round2(lineEffectiveTaxable * (taxRate / 100));

    const existing = slabMap.get(taxRate) || { taxableAmount: 0, taxAmount: 0 };
    slabMap.set(taxRate, {
      taxableAmount: round2(existing.taxableAmount + lineEffectiveTaxable),
      taxAmount: round2(existing.taxAmount + lineTax),
    });
  }

  const taxBreakdown: TaxBreakdownSlab[] = [];
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const [rate, slab] of Array.from(slabMap.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (taxMode === "CGST_SGST") {
      cgst = round2(slab.taxAmount / 2);
      sgst = round2(slab.taxAmount - cgst);
    } else {
      igst = slab.taxAmount;
    }

    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    taxBreakdown.push({
      rate,
      taxableAmount: slab.taxableAmount,
      taxAmount: slab.taxAmount,
      cgst,
      sgst,
      igst,
    });
  }

  totalCgst = round2(totalCgst);
  totalSgst = round2(totalSgst);
  totalIgst = round2(totalIgst);
  const totalTax = round2(totalCgst + totalSgst + totalIgst);
  const total = round2(totalTaxable + totalTax);

  const totalRemainingQuantity = round3(
    Math.max(0, totalOrderedQuantity - totalReceivedQuantity),
  );
  const receivingPercentage =
    totalOrderedQuantity > 0
      ? round2((totalReceivedQuantity / totalOrderedQuantity) * 100)
      : 0;

  return {
    subtotal: grossSubtotal,
    lineDiscountTotal,
    effectiveAdditionalDiscount,
    additionalCharges: validAdditionalCharges,
    taxableAmount: totalTaxable,
    cgst: totalCgst,
    sgst: totalSgst,
    igst: totalIgst,
    totalTax,
    total,
    taxBreakdown,
    totalOrderedQuantity: round3(totalOrderedQuantity),
    totalReceivedQuantity: round3(totalReceivedQuantity),
    totalRemainingQuantity,
    receivingPercentage,
  };
};

/**
 * Validates domain rules for purchase order line items.
 */
export const validatePurchaseOrderLines = (
  items: Array<{
    item: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    receivedQuantity?: number;
  }>,
): void => {
  if (!items || items.length === 0) {
    throw new InvalidPurchaseOrderLineError(
      "A Purchase Order must contain at least one line item.",
    );
  }

  items.forEach((it, idx) => {
    const itemNumber = idx + 1;
    if (!it.item || it.item.trim().length === 0) {
      throw new InvalidPurchaseOrderLineError(
        `Line item #${itemNumber} description/name cannot be empty.`,
      );
    }
    if (typeof it.quantity !== "number" || isNaN(it.quantity) || it.quantity <= 0) {
      throw new InvalidPurchaseOrderLineError(
        `Line item #${itemNumber} ("${it.item}") must have a positive quantity greater than 0.`,
      );
    }
    if (typeof it.unitPrice !== "number" || isNaN(it.unitPrice) || it.unitPrice < 0) {
      throw new InvalidPurchaseOrderLineError(
        `Line item #${itemNumber} ("${it.item}") unit price cannot be negative.`,
      );
    }
    if (
      it.discount !== undefined &&
      (it.discount < 0 || it.discount > 100 || isNaN(it.discount))
    ) {
      throw new InvalidPurchaseOrderLineError(
        `Line item #${itemNumber} ("${it.item}") discount must be between 0% and 100%.`,
      );
    }
    if (
      it.taxRate !== undefined &&
      (it.taxRate < 0 || it.taxRate > 100 || isNaN(it.taxRate))
    ) {
      throw new InvalidPurchaseOrderLineError(
        `Line item #${itemNumber} ("${it.item}") tax rate cannot be negative.`,
      );
    }
    if (
      it.receivedQuantity !== undefined &&
      (it.receivedQuantity < 0 || it.receivedQuantity > it.quantity)
    ) {
      throw new InvalidPurchaseOrderLineError(
        `Line item #${itemNumber} ("${it.item}") received quantity (${it.receivedQuantity}) cannot exceed ordered quantity (${it.quantity}).`,
      );
    }
  });
};

/**
 * Computes default expected delivery date (ISO YYYY-MM-DD string)
 * by adding days to the order date.
 */
export const calculateExpectedDeliveryDate = (
  orderDateIso: string,
  days: number,
): string => {
  const date = new Date(orderDateIso);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  date.setDate(date.getDate() + Math.max(1, days));
  return date.toISOString().split("T")[0];
};

export const getTodayDateString = (): string =>
  new Date().toISOString().split("T")[0];
