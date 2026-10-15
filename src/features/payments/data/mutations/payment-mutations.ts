"use server";

import { revalidatePath } from "next/cache";
import { InvoiceStatus as PrismaInvoiceStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import { isOrganizationAdmin } from "@/features/auth";
import { resolvePaymentContext } from "../context/payment-context";
import { paymentRepository } from "../../infrastructure/repositories/prisma-payment-repository";
import { invoiceRepository } from "@/features/invoices/infrastructure/repositories/prisma-invoice-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import {
  allocatedTotal,
  roundCurrency,
  validatePaymentAllocations,
  type Payment,
} from "../../domain/payment";
import {
  calculateAllocationAvailability,
  isInvoiceEligibleForPayment,
} from "../../domain/rules/payment-rules";
import { calculateInvoiceTotals, deriveInvoicePaymentStatus } from "@/features/invoices";
import { getTodayDateString } from "@/features/invoices/domain/invoice";
import {
  recordPaymentSchema,
  reversePaymentSchema,
} from "../validators/payment-schemas";
import type {
  PaymentActionResult,
  RecordPaymentInputDto,
  ReversePaymentInputDto,
} from "../dto/payment-dto";
import {
  CustomerMismatchError,
  ExceededInvoiceBalanceError,
  IneligibleInvoiceForPaymentError,
  InvalidPaymentStatusTransitionError,
  PaymentNotFoundError,
  PaymentTotalMismatchError,
  UnauthorizedPaymentAccessError,
} from "../../domain/errors/payment-errors";
import { CustomerNotFoundError } from "@/features/customers/domain/errors/customer-errors";

const toPrismaStatus = (status: "Paid" | "Partially Paid"): PrismaInvoiceStatus =>
  status === "Paid" ? PrismaInvoiceStatus.PAID : PrismaInvoiceStatus.PARTIALLY_PAID;

export const recordPaymentAction = async (
  input: RecordPaymentInputDto,
): Promise<PaymentActionResult<Payment>> => {
  try {
    const parseResult = recordPaymentSchema.safeParse(input);
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

    const { organizationId, memberRole, userId } = await resolvePaymentContext();
    const data = parseResult.data;

    // Recording cash is a financial mutation — owner/admin only.
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedPaymentAccessError(
        "Only organization owners or admins can record payments.",
      );
    }

    // A received payment cannot be dated in the future.
    if (data.paymentDate > getTodayDateString()) {
      return {
        success: false,
        error: "Payment date cannot be in the future.",
        fieldErrors: { paymentDate: "Payment date cannot be in the future." },
      };
    }

    // Verify the customer belongs to this organization.
    const customer = await customerRepository.findById(organizationId, data.customerId);
    if (!customer) {
      throw new CustomerNotFoundError(data.customerId);
    }

    const lineErrors = validatePaymentAllocations(data.allocations);
    if (Object.keys(lineErrors).length > 0) {
      return {
        success: false,
        error: "Invalid allocations provided.",
        fieldErrors: lineErrors,
      };
    }

    // Full-allocation policy: received cash must be entirely applied.
    // Unallocated balances are not permitted; excess is rejected per invoice.
    const allocationsSum = allocatedTotal(data.allocations);
    if (roundCurrency(data.amount) !== allocationsSum) {
      throw new PaymentTotalMismatchError(data.amount, allocationsSum);
    }

    // Idempotent retry: a repeated submission with the same key returns the
    // original payment instead of recording a duplicate.
    const idempotencyKey = data.idempotencyKey?.trim() || undefined;
    if (idempotencyKey) {
      const existing = await paymentRepository.findByIdempotencyKey(
        organizationId,
        idempotencyKey,
      );
      if (existing) {
        return { success: true, data: existing };
      }
    }

    const prisma = getPrisma();
    const saved = await prisma.$transaction(async (tx) => {
      // Lock all affected invoices in deterministic order to serialize
      // concurrent allocations without deadlocks.
      const invoiceIds = [...new Set(data.allocations.map((allocation) => allocation.invoiceId))].sort();
      for (const invoiceId of invoiceIds) {
        await tx.$queryRaw`
          SELECT "id" FROM invoice
          WHERE "id" = ${invoiceId} AND "organizationId" = ${organizationId}
          FOR UPDATE
        `;
      }

      // Re-verify every allocation against authoritative in-transaction sums.
      const newAllocatedSums = new Map<string, number>();
      for (const allocation of data.allocations) {
        const invoice = await invoiceRepository.findById(organizationId, allocation.invoiceId);
        if (!invoice) {
          throw new PaymentNotFoundError(
            `Invoice '${allocation.invoiceId}' does not exist or does not belong to your organization.`,
          );
        }
        if (!isInvoiceEligibleForPayment(invoice.status)) {
          throw new IneligibleInvoiceForPaymentError(invoice.number, invoice.status);
        }
        if (!invoice.customerId || invoice.customerId !== data.customerId) {
          throw new CustomerMismatchError();
        }

        const invoiceTotal = calculateInvoiceTotals(invoice).total;
        const previouslyAllocated = await paymentRepository.getActiveAllocatedTotalForInvoice(
          organizationId,
          invoice.id,
          undefined,
          tx,
        );
        const availability = calculateAllocationAvailability({
          invoiceTotal,
          legacyPaid: invoice.amountPaid,
          previouslyAllocated,
          creditedTotal: invoice.creditedAmount ?? 0,
          debitedTotal: invoice.debitedAmount ?? 0,
          newAllocation: allocation.amount,
        });
        if (!availability.isAllowed) {
          throw new ExceededInvoiceBalanceError(
            allocation.amount,
            availability.remainingBalance,
            invoice.number,
          );
        }
        newAllocatedSums.set(
          invoice.id,
          roundCurrency(previouslyAllocated + roundCurrency(allocation.amount)),
        );
      }

      let createdRecord;
      try {
        createdRecord = await paymentRepository.create(
          {
            id: `pay_${crypto.randomUUID()}`,
            organizationId,
            customerId: data.customerId,
            customerName: customer.name,
            amount: roundCurrency(data.amount),
            currency: "INR (₹)",
            paymentDate: new Date(`${data.paymentDate}T00:00:00.000Z`),
            method: data.method,
            reference: data.reference || null,
            notes: data.notes || null,
            idempotencyKey,
            createdBy: userId,
            allocations: data.allocations.map((allocation) => ({
              id: `palloc_${crypto.randomUUID()}`,
              invoiceId: allocation.invoiceId,
              amount: roundCurrency(allocation.amount),
            })),
          },
          tx,
        );
      } catch (err: unknown) {
        // Lost the idempotency race: another request recorded this key first.
        if (
          err instanceof Error &&
          "code" in err &&
          (err as { code?: string }).code === "P2002" &&
          idempotencyKey
        ) {
          const winner = await paymentRepository.findByIdempotencyKey(
            organizationId,
            idempotencyKey,
          );
          if (winner) {
            return winner;
          }
        }
        throw err;
      }

      // Derive each affected invoice's status from authoritative money,
      // including this payment's newly allocated cash.
      for (const invoiceId of invoiceIds) {
        const invoice = await invoiceRepository.findById(organizationId, invoiceId);
        if (!invoice) {
          continue;
        }
        const invoiceTotal = calculateInvoiceTotals(invoice).total;
        const nextStatus = deriveInvoicePaymentStatus({
          currentStatus: invoice.status,
          total: invoiceTotal,
          amountPaid: invoice.amountPaid,
          allocatedCash: newAllocatedSums.get(invoiceId) ?? invoice.allocatedCash ?? 0,
          creditedAmount: invoice.creditedAmount ?? 0,
          debitedAmount: invoice.debitedAmount ?? 0,
        });
        if (
          nextStatus !== invoice.status &&
          (nextStatus === "Paid" || nextStatus === "Partially Paid")
        ) {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: { status: toPrismaStatus(nextStatus) },
          });
        }
      }

      return createdRecord;
    });

    revalidatePath("/payments");
    revalidatePath("/payments/new");
    revalidatePath(`/payments/${saved.id}`);
    revalidatePath("/invoices");
    for (const allocation of data.allocations) {
      revalidatePath(`/invoices/${allocation.invoiceId}`);
    }

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

export const reversePaymentAction = async (
  input: ReversePaymentInputDto,
): Promise<PaymentActionResult<Payment>> => {
  try {
    const parseResult = reversePaymentSchema.safeParse(input);
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

    const { organizationId, memberRole, userId } = await resolvePaymentContext();
    const data = parseResult.data;

    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedPaymentAccessError(
        "Only organization owners or admins can reverse payments.",
      );
    }

    const existing = await paymentRepository.findById(organizationId, data.id);
    if (!existing) {
      throw new PaymentNotFoundError(data.id);
    }
    if (existing.status !== "Active") {
      throw new InvalidPaymentStatusTransitionError(existing.status, "reverse");
    }

    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      // Conditional transition: only Active reverses, so a repeated reversal
      // can never double-decrease balances.
      const reversed = await paymentRepository.reverse(
        organizationId,
        existing.id,
        {
          reason: data.reason || null,
          reversedBy: userId,
          reversedAt: new Date(),
        },
        tx,
      );
      if (reversed === 0) {
        throw new InvalidPaymentStatusTransitionError(existing.status, "reverse");
      }

      // Recompute every affected invoice from authoritative records. Stored
      // statuses may be stale after cash disappears, so a cashless balance
      // honestly returns to Issued rather than preserving a stale Paid.
      const invoiceIds = [...new Set(existing.allocations.map((line) => line.invoiceId))].sort();
      for (const invoiceId of invoiceIds) {
        await tx.$queryRaw`
          SELECT "id" FROM invoice
          WHERE "id" = ${invoiceId} AND "organizationId" = ${organizationId}
          FOR UPDATE
        `;
        const invoice = await invoiceRepository.findById(organizationId, invoiceId);
        if (!invoice) {
          continue;
        }
        // The reversal above is uncommitted in this transaction while the
        // repository reads through a separate connection, so the mapper sum
        // still includes this payment: subtract it explicitly for honest math.
        const reversedHere = roundCurrency(
          existing.allocations
            .filter((line) => line.invoiceId === invoiceId)
            .reduce((sum, line) => sum + line.amount, 0),
        );
        const allocatedExcluding = roundCurrency(
          Math.max(0, roundCurrency(invoice.allocatedCash ?? 0) - reversedHere),
        );
        const invoiceTotal = calculateInvoiceTotals(invoice).total;
        const effectiveCash = roundCurrency(
          roundCurrency(invoice.amountPaid) + allocatedExcluding,
        );
        const obligation = roundCurrency(
          roundCurrency(invoiceTotal) -
            roundCurrency(invoice.creditedAmount ?? 0) +
            roundCurrency(invoice.debitedAmount ?? 0),
        );
        const remaining = roundCurrency(Math.max(0, obligation - effectiveCash));
        let nextStatus = deriveInvoicePaymentStatus({
          currentStatus: invoice.status,
          total: invoiceTotal,
          amountPaid: invoice.amountPaid,
          allocatedCash: allocatedExcluding,
          creditedAmount: invoice.creditedAmount ?? 0,
          debitedAmount: invoice.debitedAmount ?? 0,
        });
        if (remaining > 0 && effectiveCash <= 0 && invoice.status !== "Cancelled") {
          nextStatus = "Issued";
        }
        if (
          nextStatus !== invoice.status &&
          (nextStatus === "Paid" || nextStatus === "Partially Paid" || nextStatus === "Issued")
        ) {
          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              status:
                nextStatus === "Paid"
                  ? PrismaInvoiceStatus.PAID
                  : nextStatus === "Partially Paid"
                    ? PrismaInvoiceStatus.PARTIALLY_PAID
                    : PrismaInvoiceStatus.ISSUED,
            },
          });
        }
      }
    });

    revalidatePath("/payments");
    revalidatePath(`/payments/${existing.id}`);
    revalidatePath("/invoices");
    for (const allocation of existing.allocations) {
      revalidatePath(`/invoices/${allocation.invoiceId}`);
    }

    const reloaded = await paymentRepository.findById(organizationId, existing.id);
    if (!reloaded) {
      throw new PaymentNotFoundError(existing.id);
    }

    return {
      success: true,
      data: reloaded,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
