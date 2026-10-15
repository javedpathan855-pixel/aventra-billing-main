import type {
  PurchaseBillTotals,
  TaxBreakdownSlab,
} from "../entities/purchase-bill";
import {
  InvalidPurchaseBillLineError,
  PurchaseBillDomainError,
} from "../errors/purchase-bill-errors";

const round2 = (val: number): number =>
  Math.round((val + Number.EPSILON) * 100) / 100;

export type CalculateTotalsParams = {
  items: Array<{
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
  }>;
  taxMode: "CGST_SGST" | "IGST";
  additionalCharges?: number;
  additionalDiscount?: number;
  additionalDiscountType?: "fixed" | "percentage";
};

/**
 * Pure domain calculation of purchase bill financial totals and tax
 * distribution. Uses the exact rounding and GST slab mechanics as the
 * Purchase Order, Invoice, and Estimate modules: gross subtotal, line
 * discounts, a document-level discount (fixed or percentage, clamped so the
 * taxable amount can never go negative), additional charges, proportional
 * slab allocation, and CGST/SGST splitting.
 */
export const calculatePurchaseBillTotals = ({
  items,
  taxMode,
  additionalCharges = 0,
  additionalDiscount = 0,
  additionalDiscountType = "fixed",
}: CalculateTotalsParams): PurchaseBillTotals => {
  let grossSubtotal = 0;
  let lineDiscountTotal = 0;

  for (const it of items) {
    const qty = Math.max(0, it.quantity || 0);
    const price = Math.max(0, it.unitPrice || 0);
    const discPct = Math.min(100, Math.max(0, it.discount || 0));

    const gross = qty * price;
    const disc = gross * (discPct / 100);

    grossSubtotal += gross;
    lineDiscountTotal += disc;
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
  };
};

/**
 * Validates domain rules for purchase bill line items.
 */
export const validatePurchaseBillLines = (
  items: Array<{
    item: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
  }>,
): void => {
  if (!items || items.length === 0) {
    throw new InvalidPurchaseBillLineError(
      "A Purchase Bill must contain at least one line item.",
    );
  }

  items.forEach((it, idx) => {
    const itemNumber = idx + 1;
    if (!it.item || it.item.trim().length === 0) {
      throw new InvalidPurchaseBillLineError(
        `Line item #${itemNumber} description/name cannot be empty.`,
      );
    }
    if (
      typeof it.quantity !== "number" ||
      isNaN(it.quantity) ||
      it.quantity <= 0
    ) {
      throw new InvalidPurchaseBillLineError(
        `Line item #${itemNumber} ("${it.item}") must have a positive quantity greater than 0.`,
      );
    }
    if (
      typeof it.unitPrice !== "number" ||
      isNaN(it.unitPrice) ||
      it.unitPrice < 0
    ) {
      throw new InvalidPurchaseBillLineError(
        `Line item #${itemNumber} ("${it.item}") unit price cannot be negative.`,
      );
    }
    if (
      it.discount !== undefined &&
      (it.discount < 0 || it.discount > 100 || isNaN(it.discount))
    ) {
      throw new InvalidPurchaseBillLineError(
        `Line item #${itemNumber} ("${it.item}") discount must be between 0% and 100%.`,
      );
    }
    if (
      it.taxRate !== undefined &&
      (it.taxRate < 0 || it.taxRate > 100 || isNaN(it.taxRate))
    ) {
      throw new InvalidPurchaseBillLineError(
        `Line item #${itemNumber} ("${it.item}") tax rate cannot be negative.`,
      );
    }
  });
};

/**
 * Validates the bill date / due date relationship. A due date before the
 * bill date is rejected; missing values are left to schema validation.
 */
export const validatePurchaseBillDates = (
  billDateIso: string,
  dueDateIso: string,
): void => {
  const billDate = new Date(billDateIso);
  const dueDate = new Date(dueDateIso);
  if (isNaN(billDate.getTime()) || isNaN(dueDate.getTime())) {
    return;
  }
  if (dueDate < billDate) {
    throw new PurchaseBillDomainError(
      `Due date (${dueDateIso}) cannot be before the bill date (${billDateIso}).`,
    );
  }
};

/**
 * Computes a default due date (ISO YYYY-MM-DD string) by adding days to the
 * bill date.
 */
export const calculateDefaultDueDate = (
  billDateIso: string,
  days: number,
): string => {
  const date = new Date(billDateIso);
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  date.setDate(date.getDate() + Math.max(1, days));
  return date.toISOString().split("T")[0];
};

export const getTodayDateString = (): string =>
  new Date().toISOString().split("T")[0];
