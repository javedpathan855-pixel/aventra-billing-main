"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/shared/lib/prisma";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveSupplierPaymentContext } from "../context/supplier-payment-context";
import { supplierPaymentRepository } from "../../infrastructure/repositories/prisma-supplier-payment-repository";
import { supplierRepository } from "@/features/suppliers/infrastructure/repositories/prisma-supplier-repository";
import { purchaseBillRepository } from "@/features/purchase-bills/infrastructure/repositories/prisma-purchase-bill-repository";
import {
  allocatedTotal,
  roundCurrency,
  validateSupplierPaymentAllocations,
  type SupplierPayment,
} from "../../domain/supplier-payment";
import {
  calculateAllocationAvailability,
  getTodayDateString,
  isBillEligibleForPayment,
} from "../../domain/rules/supplier-payment-rules";
import {
  recordSupplierPaymentSchema,
  reverseSupplierPaymentSchema,
} from "../validators/supplier-payment-schemas";
import type {
  SupplierPaymentActionResult,
  RecordSupplierPaymentInputDto,
  ReverseSupplierPaymentInputDto,
} from "../dto/supplier-payment-dto";
import {
  SupplierMismatchError,
  ExceededBillBalanceError,
  IneligibleBillForPaymentError,
  InvalidSupplierPaymentStatusTransitionError,
  SupplierPaymentNotFoundError,
  SupplierPaymentTotalMismatchError,
  UnauthorizedSupplierPaymentAccessError,
} from "../../domain/errors/supplier-payment-errors";
import { SupplierNotFoundError } from "@/features/suppliers/domain/errors/supplier-errors";

export const recordSupplierPaymentAction = async (
  input: RecordSupplierPaymentInputDto,
): Promise<SupplierPaymentActionResult<SupplierPayment>> => {
  try {
    const parseResult = recordSupplierPaymentSchema.safeParse(input);
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

    const { organizationId, memberRole, userId } =
      await resolveSupplierPaymentContext();
    const data = parseResult.data;

    // Paying out cash is a financial mutation — owner/admin only.
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedSupplierPaymentAccessError(
        "Only organization owners or admins can record supplier payments.",
      );
    }

    // A payment cannot be dated in the future.
    if (data.paymentDate > getTodayDateString()) {
      return {
        success: false,
        error: "Payment date cannot be in the future.",
        fieldErrors: { paymentDate: "Payment date cannot be in the future." },
      };
    }

    // Verify the supplier belongs to this organization.
    const supplier = await supplierRepository.findById(
      organizationId,
      data.supplierId,
    );
    if (!supplier) {
      throw new SupplierNotFoundError(data.supplierId);
    }

    const lineErrors = validateSupplierPaymentAllocations(data.allocations);
    if (Object.keys(lineErrors).length > 0) {
      return {
        success: false,
        error: "Invalid allocations provided.",
        fieldErrors: lineErrors,
      };
    }

    // Full-allocation policy: paid cash must be entirely applied to bills.
    // Unallocated balances (advances) are not permitted.
    const allocationsSum = allocatedTotal(data.allocations);
    if (roundCurrency(data.amount) !== allocationsSum) {
      throw new SupplierPaymentTotalMismatchError(data.amount, allocationsSum);
    }

    // Idempotent retry: a repeated submission with the same key returns the
    // original payment instead of recording a duplicate.
    const idempotencyKey = data.idempotencyKey?.trim() || undefined;
    if (idempotencyKey) {
      const existing = await supplierPaymentRepository.findByIdempotencyKey(
        organizationId,
        idempotencyKey,
      );
      if (existing) {
        return { success: true, data: existing };
      }
    }

    const prisma = getPrisma();
    const saved = await prisma.$transaction(async (tx) => {
      // Lock all affected bills in deterministic order to serialize
      // concurrent allocations without deadlocks.
      const billIds = [
        ...new Set(data.allocations.map((allocation) => allocation.purchaseBillId)),
      ].sort();
      for (const billId of billIds) {
        await tx.$queryRaw`
          SELECT "id" FROM purchase_bill
          WHERE "id" = ${billId} AND "organizationId" = ${organizationId}
          FOR UPDATE
        `;
      }

      // Re-verify every allocation against authoritative in-transaction sums.
      for (const allocation of data.allocations) {
        const bill = await purchaseBillRepository.findById(
          organizationId,
          allocation.purchaseBillId,
        );
        if (!bill) {
          throw new SupplierPaymentNotFoundError(
            `Purchase bill '${allocation.purchaseBillId}' does not exist or does not belong to your organization.`,
          );
        }
        if (!isBillEligibleForPayment(bill.status)) {
          throw new IneligibleBillForPaymentError(bill.billNumber, bill.status);
        }
        if (!bill.supplierId || bill.supplierId !== data.supplierId) {
          throw new SupplierMismatchError();
        }

        const previouslyAllocated =
          await supplierPaymentRepository.getActiveAllocatedTotalForBill(
            organizationId,
            bill.id,
            undefined,
            tx,
          );
        const availability = calculateAllocationAvailability({
          billTotal: bill.total,
          previouslyAllocated,
          newAllocation: allocation.amount,
        });
        if (!availability.isAllowed) {
          throw new ExceededBillBalanceError(
            allocation.amount,
            availability.remainingBalance,
            bill.billNumber,
          );
        }
      }

      let createdRecord;
      try {
        createdRecord = await supplierPaymentRepository.create(
          {
            id: `spay_${crypto.randomUUID()}`,
            organizationId,
            supplierId: data.supplierId,
            supplierName: supplier.name,
            amount: roundCurrency(data.amount),
            currency: "INR (₹)",
            paymentDate: new Date(`${data.paymentDate}T00:00:00.000Z`),
            method: data.method,
            reference: data.reference || null,
            notes: data.notes || null,
            idempotencyKey,
            createdBy: userId,
            allocations: data.allocations.map((allocation) => ({
              id: `spalloc_${crypto.randomUUID()}`,
              purchaseBillId: allocation.purchaseBillId,
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
          const winner = await supplierPaymentRepository.findByIdempotencyKey(
            organizationId,
            idempotencyKey,
          );
          if (winner) {
            return winner;
          }
        }
        throw err;
      }

      return createdRecord;
    });

    revalidatePath("/supplier-payments");
    revalidatePath("/supplier-payments/new");
    revalidatePath(`/supplier-payments/${saved.id}`);
    revalidatePath("/purchase-bills");
    for (const allocation of data.allocations) {
      revalidatePath(`/purchase-bills/${allocation.purchaseBillId}`);
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

export const reverseSupplierPaymentAction = async (
  input: ReverseSupplierPaymentInputDto,
): Promise<SupplierPaymentActionResult<SupplierPayment>> => {
  try {
    const parseResult = reverseSupplierPaymentSchema.safeParse(input);
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

    const { organizationId, memberRole, userId } =
      await resolveSupplierPaymentContext();
    const data = parseResult.data;

    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedSupplierPaymentAccessError(
        "Only organization owners or admins can reverse supplier payments.",
      );
    }

    const existing = await supplierPaymentRepository.findById(
      organizationId,
      data.id,
    );
    if (!existing) {
      throw new SupplierPaymentNotFoundError(data.id);
    }
    if (existing.status !== "Active") {
      throw new InvalidSupplierPaymentStatusTransitionError(
        existing.status,
        "reverse",
      );
    }

    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      // Conditional transition: only Active reverses, so a repeated reversal
      // can never double-restore balances. Outstanding balances are always
      // recomputed from active allocations, so no bill fields need writes.
      const reversed = await supplierPaymentRepository.reverse(
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
        throw new InvalidSupplierPaymentStatusTransitionError(
          existing.status,
          "reverse",
        );
      }

      // Lock affected bills so concurrent allocations observe the reversal.
      const billIds = [
        ...new Set(existing.allocations.map((line) => line.purchaseBillId)),
      ].sort();
      for (const billId of billIds) {
        await tx.$queryRaw`
          SELECT "id" FROM purchase_bill
          WHERE "id" = ${billId} AND "organizationId" = ${organizationId}
          FOR UPDATE
        `;
      }
    });

    revalidatePath("/supplier-payments");
    revalidatePath(`/supplier-payments/${existing.id}`);
    revalidatePath("/purchase-bills");
    for (const allocation of existing.allocations) {
      revalidatePath(`/purchase-bills/${allocation.purchaseBillId}`);
    }

    const reloaded = await supplierPaymentRepository.findById(
      organizationId,
      existing.id,
    );
    if (!reloaded) {
      throw new SupplierPaymentNotFoundError(existing.id);
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
