"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";
import { DebitNoteStatus as PrismaDebitNoteStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveDebitNoteContext } from "../context/debit-note-context";
import { debitNoteRepository } from "../../infrastructure/repositories/prisma-debit-note-repository";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import { billingSettingsRepository } from "@/features/billing-settings";
import {
  calculateDebitNoteTotals,
  lineTax,
  lineTaxable,
  roundCurrency,
  validateDebitNoteLineItems,
  type DebitNote,
  type DebitNoteLineItem,
} from "../../domain/debit-note";
import { calculateInvoiceTotals, deriveInvoicePaymentStatus } from "@/features/invoices";
import {
  calculateDebitAvailability,
  isInvoiceEligibleForDebit,
} from "../../domain/rules/debit-calculation-rules";
import {
  createDebitNoteSchema,
  updateDebitNoteSchema,
} from "../validators/debit-note-schemas";
import type {
  CreateDebitNoteInputDto,
  DebitNoteActionResult,
  UpdateDebitNoteInputDto,
} from "../dto/debit-note-dto";
import {
  DebitNoteNotFoundError,
  DuplicateDebitNoteNumberError,
  ExceededInvoiceDebitLimitError,
  IneligibleInvoiceForDebitError,
  InvalidDebitNoteStatusTransitionError,
  DebitNoteImmutableError,
  UnauthorizedDebitNoteAccessError,
} from "../../domain/errors/debit-note-errors";

export const createDebitNoteAction = async (
  input: CreateDebitNoteInputDto,
): Promise<DebitNoteActionResult<DebitNote>> => {
  try {
    const parseResult = createDebitNoteSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const { organizationId, memberRole } = await resolveDebitNoteContext();
    const data = parseResult.data;

    // Issuing a debit note raises a receivable — owner/admin only.
    // Draft creation stays open to members; issuance is the gated transition.
    if (data.status === "Issued" && !isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedDebitNoteAccessError(
        "Only organization owners or admins can issue debit notes.",
      );
    }

    // 1. Authoritative verification of original invoice
    const originalInvoice = await invoiceRepository.findById(
      organizationId,
      data.invoiceId,
    );
    if (!originalInvoice) {
      return {
        success: false,
        error: `Original invoice '${data.invoiceId}' does not exist or does not belong to your organization.`,
      };
    }

    if (!isInvoiceEligibleForDebit(originalInvoice.status)) {
      throw new IneligibleInvoiceForDebitError(
        originalInvoice.number,
        originalInvoice.status,
      );
    }

    // 2. Prepare domain line items
    const domainItems: DebitNoteLineItem[] = data.items.map((it, idx) => ({
      id: it.id || `dn_line_${idx + 1}_${crypto.randomUUID().slice(0, 8)}`,
      invoiceItemId: it.invoiceItemId,
      productId: it.productId,
      item: it.item,
      description: it.description || "",
      hsnSac: it.hsnSac || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    }));

    const lineErrors = validateDebitNoteLineItems(domainItems);
    if (Object.keys(lineErrors).length > 0) {
      return {
        success: false,
        error: "Invalid line items provided.",
        fieldErrors: lineErrors,
      };
    }

    // 3. Authoritative totals calculation using original invoice taxMode
    const calculatedTotals = calculateDebitNoteTotals({
      items: domainItems,
      taxMode: originalInvoice.taxMode,
    });

    if (calculatedTotals.total <= 0) {
      return {
        success: false,
        error: "Debit note total must be greater than zero.",
      };
    }

    const prisma = getPrisma();

    // 4. Concurrency-safe atomic transaction
    const saved = await prisma.$transaction(async (tx) => {
      // Row-lock the invoice to serialize concurrent debit notes on this invoice
      await tx.$queryRaw`
        SELECT "id" FROM invoice
        WHERE "id" = ${originalInvoice.id} AND "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      // Calculate authoritative remaining debit availability
      const previouslyIssuedTotal =
        await debitNoteRepository.getIssuedTotalForInvoice(
          organizationId,
          originalInvoice.id,
          undefined,
          tx,
        );

      const invoiceTotal = calculateInvoiceTotals(originalInvoice).total;
      const availabilityCheck = calculateDebitAvailability({
        invoiceTotal,
        previouslyDebitedTotal: previouslyIssuedTotal,
        newDebitTotal: calculatedTotals.total,
      });

      if (!availabilityCheck.isAllowed) {
        throw new ExceededInvoiceDebitLimitError(
          calculatedTotals.total,
          availabilityCheck.remainingAvailableDebit,
          originalInvoice.number,
        );
      }

      // Allocate unique debit note number
      let finalNumber = data.debitNoteNumber?.trim();
      if (!finalNumber) {
        const allocated = await billingSettingsRepository.allocateNextNumber(
          organizationId,
          "DEBIT_NOTE",
          tx,
        );
        finalNumber = allocated.allocatedNumber;
      } else {
        const existing = await tx.debitNote.findUnique({
          where: {
            organizationId_debitNoteNumber: {
              organizationId,
              debitNoteNumber: finalNumber,
            },
          },
          select: { id: true },
        });
        if (existing) {
          throw new DuplicateDebitNoteNumberError(finalNumber);
        }
      }

      const debitNoteId = `dn_${crypto.randomUUID()}`;

      const repositoryItems = domainItems.map((it, idx) => {
        const taxable = lineTaxable(it);
        const taxAmt = lineTax(it);
        const lineTot = roundCurrency(taxable + taxAmt);
        return {
          id: `dn_item_${crypto.randomUUID()}`,
          invoiceItemId: it.invoiceItemId ?? null,
          productId: it.productId ?? null,
          item: it.item,
          description: it.description ?? null,
          hsnSac: it.hsnSac ?? null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
          taxableAmount: taxable,
          taxAmount: taxAmt,
          lineTotal: lineTot,
          sortOrder: idx,
        };
      });

      // Fallback default notes and terms from Billing Settings if not provided
      let effectiveNotes = data.notes?.trim() || null;
      let effectiveTerms = data.terms?.trim() || null;
      if (!effectiveNotes || !effectiveTerms) {
        const settings = await billingSettingsRepository.getSettings(
          organizationId,
          "DEBIT_NOTE",
          tx,
        );
        if (!effectiveNotes && settings.defaultNotes) {
          effectiveNotes = settings.defaultNotes;
        }
        if (!effectiveTerms && settings.defaultTerms) {
          effectiveTerms = settings.defaultTerms;
        }
      }

      const createdRecord = await debitNoteRepository.create(
        {
          id: debitNoteId,
          organizationId,
          debitNoteNumber: finalNumber,
          invoiceId: originalInvoice.id,
          customerId: originalInvoice.customerId ?? null,
          customerName: originalInvoice.customer,
          customerEmail: originalInvoice.customerEmail || null,
          customerAddress: originalInvoice.customerAddress || null,
          customerGstin: originalInvoice.customerGstin || null,
          customerPlaceOfSupply: originalInvoice.customerPlaceOfSupply || null,
          issueDate: new Date(`${data.issueDate}T00:00:00.000Z`),
          status: data.status,
          reason: data.reason,
          taxMode: originalInvoice.taxMode,
          currency: "INR (₹)",
          subtotal: calculatedTotals.subtotal,
          lineDiscountTotal: calculatedTotals.discount,
          taxableAmount: calculatedTotals.taxable,
          cgst: calculatedTotals.cgst,
          sgst: calculatedTotals.sgst,
          igst: calculatedTotals.igst,
          totalTax: calculatedTotals.tax,
          total: calculatedTotals.total,
          notes: effectiveNotes,
          terms: effectiveTerms,
          items: repositoryItems,
        },
        tx,
      );

      // If issuing immediately, derive the invoice payment status from
      // authoritative money. A debit raises the receivable; it is never cash
      // and can never mark an invoice PAID — but a previously Paid invoice
      // with a new outstanding balance honestly derives Partially Paid.
      if (data.status === "Issued") {
        const totalDebitedAfter = roundCurrency(previouslyIssuedTotal + calculatedTotals.total);
        const nextStatus = deriveInvoicePaymentStatus({
          currentStatus: originalInvoice.status,
          total: invoiceTotal,
          amountPaid: originalInvoice.amountPaid,
          allocatedCash: originalInvoice.allocatedCash ?? 0,
          creditedAmount: originalInvoice.creditedAmount ?? 0,
          debitedAmount: totalDebitedAfter,
        });
        if (nextStatus !== originalInvoice.status) {
          await tx.invoice.update({
            where: { id: originalInvoice.id },
            data: {
              status:
                nextStatus === "Paid"
                  ? PrismaInvoiceStatus.PAID
                  : PrismaInvoiceStatus.PARTIALLY_PAID,
            },
          });
        }
      }

      return createdRecord;
    });

    revalidatePath("/debit-notes");
    revalidatePath("/debit-notes/new");
    revalidatePath(`/debit-notes/${saved.id}`);
    revalidatePath(`/invoices/${originalInvoice.id}`);
    revalidatePath("/settings/billing");

    return {
      success: true,
      data: saved,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const updateDebitNoteAction = async (
  input: UpdateDebitNoteInputDto,
): Promise<DebitNoteActionResult<DebitNote>> => {
  try {
    const parseResult = updateDebitNoteSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const { organizationId, memberRole } = await resolveDebitNoteContext();
    const data = parseResult.data;

    const existing = await debitNoteRepository.findById(organizationId, data.id);
    if (!existing) {
      throw new DebitNoteNotFoundError(data.id);
    }

    // Only Draft debit notes can be edited
    if (existing.status !== "Draft") {
      throw new DebitNoteImmutableError(existing.debitNoteNumber);
    }

    // Draft-to-issued via update raises a receivable — owner/admin only.
    if (data.status === "Issued" && !isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedDebitNoteAccessError(
        "Only organization owners or admins can issue debit notes.",
      );
    }

    const originalInvoice = await invoiceRepository.findById(
      organizationId,
      existing.invoiceId,
    );
    if (!originalInvoice) {
      return {
        success: false,
        error: "Referenced original invoice no longer exists.",
      };
    }

    const domainItems: DebitNoteLineItem[] = data.items.map((it, idx) => ({
      id: it.id || `dn_line_${idx + 1}_${crypto.randomUUID().slice(0, 8)}`,
      invoiceItemId: it.invoiceItemId,
      productId: it.productId,
      item: it.item,
      description: it.description || "",
      hsnSac: it.hsnSac || undefined,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      taxRate: it.taxRate,
    }));

    const lineErrors = validateDebitNoteLineItems(domainItems);
    if (Object.keys(lineErrors).length > 0) {
      return {
        success: false,
        error: "Invalid line items provided.",
        fieldErrors: lineErrors,
      };
    }

    const calculatedTotals = calculateDebitNoteTotals({
      items: domainItems,
      taxMode: existing.taxMode,
    });

    if (calculatedTotals.total <= 0) {
      return {
        success: false,
        error: "Debit note total must be greater than zero.",
      };
    }

    const prisma = getPrisma();

    const updated = await prisma.$transaction(async (tx) => {
      // Row-lock invoice
      await tx.$queryRaw`
        SELECT "id" FROM invoice
        WHERE "id" = ${originalInvoice.id} AND "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      // Re-verify draft status inside the transaction so concurrent
      // transitions of the same draft cannot both succeed.
      const lockedNote = await tx.debitNote.findUnique({
        where: { id: existing.id },
        select: { status: true, organizationId: true },
      });
      if (!lockedNote || lockedNote.organizationId !== organizationId) {
        throw new DebitNoteNotFoundError(existing.id);
      }
      if (lockedNote.status !== PrismaDebitNoteStatus.DRAFT) {
        throw new InvalidDebitNoteStatusTransitionError(lockedNote.status, "update");
      }

      // Check remaining limit excluding this draft
      const previouslyIssuedTotal =
        await debitNoteRepository.getIssuedTotalForInvoice(
          organizationId,
          originalInvoice.id,
          existing.id,
          tx,
        );

      const invoiceTotal = calculateInvoiceTotals(originalInvoice).total;
      const availabilityCheck = calculateDebitAvailability({
        invoiceTotal,
        previouslyDebitedTotal: previouslyIssuedTotal,
        newDebitTotal: calculatedTotals.total,
      });

      if (!availabilityCheck.isAllowed) {
        throw new ExceededInvoiceDebitLimitError(
          calculatedTotals.total,
          availabilityCheck.remainingAvailableDebit,
          originalInvoice.number,
        );
      }

      let finalNumber = existing.debitNoteNumber;
      if (data.debitNoteNumber && data.debitNoteNumber !== existing.debitNoteNumber) {
        const conflict = await tx.debitNote.findUnique({
          where: {
            organizationId_debitNoteNumber: {
              organizationId,
              debitNoteNumber: data.debitNoteNumber,
            },
          },
          select: { id: true },
        });
        if (conflict && conflict.id !== existing.id) {
          throw new DuplicateDebitNoteNumberError(data.debitNoteNumber);
        }
        finalNumber = data.debitNoteNumber;
      }

      const repositoryItems = domainItems.map((it, idx) => {
        const taxable = lineTaxable(it);
        const taxAmt = lineTax(it);
        const lineTot = roundCurrency(taxable + taxAmt);
        return {
          id: `dn_item_${crypto.randomUUID()}`,
          invoiceItemId: it.invoiceItemId ?? null,
          productId: it.productId ?? null,
          item: it.item,
          description: it.description ?? null,
          hsnSac: it.hsnSac ?? null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
          taxableAmount: taxable,
          taxAmount: taxAmt,
          lineTotal: lineTot,
          sortOrder: idx,
        };
      });

      const updatedRecord = await debitNoteRepository.update(
        organizationId,
        existing.id,
        {
          id: existing.id,
          organizationId,
          debitNoteNumber: finalNumber,
          invoiceId: existing.invoiceId,
          customerId: originalInvoice.customerId ?? null,
          customerName: originalInvoice.customer,
          customerEmail: originalInvoice.customerEmail || null,
          customerAddress: originalInvoice.customerAddress || null,
          customerGstin: originalInvoice.customerGstin || null,
          customerPlaceOfSupply: originalInvoice.customerPlaceOfSupply || null,
          issueDate: new Date(`${data.issueDate}T00:00:00.000Z`),
          status: data.status,
          reason: data.reason,
          taxMode: existing.taxMode,
          currency: existing.currency,
          subtotal: calculatedTotals.subtotal,
          lineDiscountTotal: calculatedTotals.discount,
          taxableAmount: calculatedTotals.taxable,
          cgst: calculatedTotals.cgst,
          sgst: calculatedTotals.sgst,
          igst: calculatedTotals.igst,
          totalTax: calculatedTotals.tax,
          total: calculatedTotals.total,
          notes: data.notes || null,
          terms: data.terms || null,
          items: repositoryItems,
        },
        tx,
      );

      // Draft-to-issued via update settles exactly like the dedicated
      // issuance paths — same eligibility, derivation, and boundaries.
      if (data.status === "Issued") {
        const totalDebitedAfter = roundCurrency(previouslyIssuedTotal + calculatedTotals.total);
        const nextStatus = deriveInvoicePaymentStatus({
          currentStatus: originalInvoice.status,
          total: invoiceTotal,
          amountPaid: originalInvoice.amountPaid,
          allocatedCash: originalInvoice.allocatedCash ?? 0,
          creditedAmount: originalInvoice.creditedAmount ?? 0,
          debitedAmount: totalDebitedAfter,
        });
        if (nextStatus !== originalInvoice.status) {
          await tx.invoice.update({
            where: { id: originalInvoice.id },
            data: {
              status:
                nextStatus === "Paid"
                  ? PrismaInvoiceStatus.PAID
                  : PrismaInvoiceStatus.PARTIALLY_PAID,
            },
          });
        }
      }

      return updatedRecord;
    });

    revalidatePath("/debit-notes");
    revalidatePath(`/debit-notes/${updated.id}`);
    revalidatePath(`/invoices/${originalInvoice.id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const issueDebitNoteAction = async (
  id: string,
): Promise<DebitNoteActionResult<DebitNote>> => {
  try {
    const { organizationId, memberRole } = await resolveDebitNoteContext();

    // Dedicated issuance raises a receivable — owner/admin only.
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedDebitNoteAccessError(
        "Only organization owners or admins can issue debit notes.",
      );
    }

    const existing = await debitNoteRepository.findById(organizationId, id);
    if (!existing) {
      throw new DebitNoteNotFoundError(id);
    }

    if (existing.status !== "Draft") {
      throw new InvalidDebitNoteStatusTransitionError(existing.status, "issue");
    }

    const originalInvoice = await invoiceRepository.findById(
      organizationId,
      existing.invoiceId,
    );
    if (!originalInvoice) {
      return {
        success: false,
        error: "Referenced original invoice does not exist.",
      };
    }

    const currentExisting = existing;
    const currentInvoice = originalInvoice;

    const prisma = getPrisma();

    const issued = await prisma.$transaction(async (tx) => {
      // Row-lock invoice
      await tx.$queryRaw`
        SELECT "id" FROM invoice
        WHERE "id" = ${currentInvoice.id} AND "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      // Re-verify draft status inside the transaction so a repeated or
      // retried issuance of the same note fails instead of succeeding twice.
      const lockedNote = await tx.debitNote.findUnique({
        where: { id: currentExisting.id },
        select: { status: true, organizationId: true },
      });
      if (!lockedNote || lockedNote.organizationId !== organizationId) {
        throw new DebitNoteNotFoundError(currentExisting.id);
      }
      if (lockedNote.status !== PrismaDebitNoteStatus.DRAFT) {
        throw new InvalidDebitNoteStatusTransitionError(lockedNote.status, "issue");
      }

      const previouslyIssuedTotal =
        await debitNoteRepository.getIssuedTotalForInvoice(
          organizationId,
          currentInvoice.id,
          currentExisting.id,
          tx,
        );

      const invoiceTotal = calculateInvoiceTotals(currentInvoice).total;
      const availabilityCheck = calculateDebitAvailability({
        invoiceTotal,
        previouslyDebitedTotal: previouslyIssuedTotal,
        newDebitTotal: currentExisting.total,
      });

      if (!availabilityCheck.isAllowed) {
        throw new ExceededInvoiceDebitLimitError(
          currentExisting.total,
          availabilityCheck.remainingAvailableDebit,
          currentInvoice.number,
        );
      }

      const repositoryItems = currentExisting.items.map((it, idx) => ({
        id: `dn_item_${crypto.randomUUID()}`,
        invoiceItemId: it.invoiceItemId ?? null,
        productId: it.productId ?? null,
        item: it.item,
        description: it.description ?? null,
        hsnSac: it.hsnSac ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        taxableAmount: lineTaxable(it),
        taxAmount: lineTax(it),
        lineTotal: roundCurrency(lineTaxable(it) + lineTax(it)),
        sortOrder: idx,
      }));

      const updatedRecord = await debitNoteRepository.update(
        organizationId,
        currentExisting.id,
        {
          id: currentExisting.id,
          organizationId,
          debitNoteNumber: currentExisting.debitNoteNumber,
          invoiceId: currentExisting.invoiceId,
          customerId: currentExisting.customerId ?? null,
          customerName: currentExisting.customerName,
          customerEmail: currentExisting.customerEmail || null,
          customerAddress: currentExisting.customerAddress || null,
          customerGstin: currentExisting.customerGstin || null,
          customerPlaceOfSupply: currentExisting.customerPlaceOfSupply || null,
          issueDate: new Date(`${currentExisting.issueDate}T00:00:00.000Z`),
          status: "Issued",
          reason: currentExisting.reason,
          taxMode: currentExisting.taxMode,
          currency: currentExisting.currency,
          subtotal: currentExisting.subtotal,
          lineDiscountTotal: currentExisting.lineDiscountTotal,
          taxableAmount: currentExisting.taxableAmount,
          cgst: currentExisting.cgst,
          sgst: currentExisting.sgst,
          igst: currentExisting.igst,
          totalTax: currentExisting.totalTax,
          total: currentExisting.total,
          notes: currentExisting.notes || null,
          terms: currentExisting.terms || null,
          items: repositoryItems,
        },
        tx,
      );

      // Derive the invoice payment status from authoritative money: a debit
      // raises the receivable and can never mark an invoice PAID.
      const totalDebitedAfter = roundCurrency(previouslyIssuedTotal + currentExisting.total);
      const nextStatus = deriveInvoicePaymentStatus({
        currentStatus: currentInvoice.status,
        total: invoiceTotal,
        amountPaid: currentInvoice.amountPaid,
        allocatedCash: currentInvoice.allocatedCash ?? 0,
        creditedAmount: currentInvoice.creditedAmount ?? 0,
        debitedAmount: totalDebitedAfter,
      });
      if (nextStatus !== currentInvoice.status) {
        await tx.invoice.update({
          where: { id: currentInvoice.id },
          data: {
            status:
              nextStatus === "Paid"
                ? PrismaInvoiceStatus.PAID
                : PrismaInvoiceStatus.PARTIALLY_PAID,
          },
        });
      }

      return updatedRecord;
    });

    revalidatePath("/debit-notes");
    revalidatePath(`/debit-notes/${issued.id}`);
    revalidatePath(`/invoices/${originalInvoice.id}`);

    return {
      success: true,
      data: issued,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const deleteDebitNoteAction = async (
  id: string,
): Promise<DebitNoteActionResult<{ id: string }>> => {
  try {
    const { organizationId, memberRole } = await resolveDebitNoteContext();

    // Deletion destroys draft financial history — owner/admin only.
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedDebitNoteAccessError(
        "Only organization owners or admins can delete debit notes.",
      );
    }

    const existing = await debitNoteRepository.findById(organizationId, id);
    if (!existing) {
      throw new DebitNoteNotFoundError(id);
    }

    if (existing.status !== "Draft") {
      throw new InvalidDebitNoteStatusTransitionError(existing.status, "delete");
    }

    // Row-level Draft guard closes the race where a concurrent issuance
    // commits between the check above and this delete.
    const deleted = await debitNoteRepository.delete(organizationId, id);
    if (deleted === 0) {
      throw new InvalidDebitNoteStatusTransitionError(existing.status, "delete");
    }

    revalidatePath("/debit-notes");
    revalidatePath(`/invoices/${existing.invoiceId}`);

    return {
      success: true,
      data: { id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
