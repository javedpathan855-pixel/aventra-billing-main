"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveRecurringScheduleContext } from "../context/recurring-schedule-context";
import { recurringScheduleRepository } from "../../infrastructure/repositories/prisma-recurring-repository";
import { customerRepository } from "@/features/customers/infrastructure/repositories/prisma-customer-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { validateRecurringLineItems } from "../../domain/recurring-schedule";
import { parseDateParts } from "../../domain/rules/recurrence-rules";
import {
  createRecurringScheduleSchema,
  updateRecurringScheduleSchema,
} from "../validators/recurring-schedule-schemas";
import type {
  CreateRecurringScheduleInputDto,
  RecurringActionResult,
  UpdateRecurringScheduleInputDto,
} from "../dto/recurring-schedule-dto";
import type { RecurringSchedule } from "../../domain/recurring-schedule";
import {
  canCompleteSchedule,
  canEditSchedule,
  canPauseSchedule,
  canResumeSchedule,
} from "../../domain/recurring-schedule";
import {
  InvalidRecurringStatusTransitionError,
  RecurringScheduleDomainError,
  RecurringScheduleNotFoundError,
  UnauthorizedRecurringAccessError,
} from "../../domain/errors/recurring-errors";

const toSaveItems = (
  items: CreateRecurringScheduleInputDto["items"],
): Array<{
  id: string;
  productId: string | null;
  item: string;
  description: string | null;
  hsnSac: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  sortOrder: number;
}> =>
  items.map((it, idx) => ({
    id: it.id || `rsch_line_${idx + 1}_${crypto.randomUUID().slice(0, 8)}`,
    productId: it.productId ?? null,
    item: it.item,
    description: it.description || null,
    hsnSac: it.hsnSac || null,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discount: it.discount,
    taxRate: it.taxRate,
    sortOrder: idx,
  }));

const parseValidationError = (error: { issues: Array<{ path: Array<PropertyKey>; message: string }> }) => {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const pathKey = issue.path.map(String).join(".");
    fieldErrors[pathKey] = issue.message;
  }
  return {
    success: false as const,
    error: "Validation failed. Please review the highlighted fields.",
    fieldErrors,
  };
};

const verifyCustomerReference = async (organizationId: string, customerId?: string) => {
  if (!customerId) return;
  const customer = await customerRepository.findById(organizationId, customerId);
  if (!customer) {
    throw new RecurringScheduleDomainError(
      `Customer "${customerId}" is invalid or does not belong to this organization.`,
    );
  }
};

const verifyProductReferences = async (
  organizationId: string,
  items: Array<{ productId?: string }>,
) => {
  for (const it of items) {
    if (!it.productId) continue;
    const product = await productRepository.findById(organizationId, it.productId);
    if (!product) {
      throw new RecurringScheduleDomainError(
        `Product "${it.productId}" is invalid or does not belong to this organization.`,
      );
    }
  }
};

const revalidateScheduleRoutes = (scheduleId?: string): void => {
  revalidatePath("/recurring-invoices");
  revalidatePath("/recurring-invoices/new");
  if (scheduleId) {
    revalidatePath(`/recurring-invoices/${scheduleId}`);
  }
};

/**
 * Creating a schedule establishes a standing authorization to issue invoices
 * automatically — owner/admin only, enforced server-side.
 */
export const createRecurringScheduleAction = async (
  input: CreateRecurringScheduleInputDto,
): Promise<RecurringActionResult<RecurringSchedule>> => {
  try {
    const parseResult = createRecurringScheduleSchema.safeParse(input);
    if (!parseResult.success) {
      return parseValidationError(parseResult.error);
    }

    const { organizationId, memberRole, userId } = await resolveRecurringScheduleContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedRecurringAccessError(
        "Only organization owners or admins can create recurring schedules.",
      );
    }
    const data = parseResult.data;

    await verifyCustomerReference(organizationId, data.customerId);
    await verifyProductReferences(organizationId, data.items);

    const lineErrors = validateRecurringLineItems(
      data.items.map((it, idx) => ({
        id: it.id || `line-${idx}`,
        productId: it.productId,
        item: it.item,
        description: it.description || "",
        hsnSac: it.hsnSac,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
      })),
    );
    if (Object.keys(lineErrors).length > 0) {
      return {
        success: false,
        error: "Invalid line items provided.",
        fieldErrors: lineErrors,
      };
    }

    const saved = await recurringScheduleRepository.create({
      id: `rsch_${crypto.randomUUID()}`,
      organizationId,
      name: data.name,
      customerId: data.customerId ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      customerGstin: data.customerGstin || null,
      customerPlaceOfSupply: data.customerPlaceOfSupply || null,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      nextRunDate: data.nextRunDate || data.startDate,
      timezone: data.timezone,
      status: "Active",
      paymentTerms: data.paymentTerms,
      additionalCharges: data.additionalCharges,
      additionalChargesLabel: data.additionalChargesLabel || null,
      additionalDiscount: data.additionalDiscount,
      additionalDiscountType: data.additionalDiscountType,
      additionalDiscountLabel: data.additionalDiscountLabel || null,
      notes: data.notes || null,
      terms: data.terms || null,
      items: toSaveItems(data.items),
      createdBy: userId,
    });

    revalidateScheduleRoutes(saved.id);

    return { success: true, data: saved };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};

export const updateRecurringScheduleAction = async (
  input: UpdateRecurringScheduleInputDto,
): Promise<RecurringActionResult<RecurringSchedule>> => {
  try {
    const parseResult = updateRecurringScheduleSchema.safeParse(input);
    if (!parseResult.success) {
      return parseValidationError(parseResult.error);
    }

    const { organizationId, memberRole } = await resolveRecurringScheduleContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedRecurringAccessError(
        "Only organization owners or admins can edit recurring schedules.",
      );
    }
    const data = parseResult.data;

    const existing = await recurringScheduleRepository.findById(organizationId, data.id);
    if (!existing) {
      throw new RecurringScheduleNotFoundError(data.id);
    }
    if (!canEditSchedule(existing.status)) {
      throw new InvalidRecurringStatusTransitionError(existing.status, "edit");
    }

    await verifyCustomerReference(organizationId, data.customerId);
    await verifyProductReferences(organizationId, data.items);

    // Edits affect future generations only. nextRunDate is preserved unless
    // the schedule never generated and the start moved with it.
    let nextRunDate = data.nextRunDate || existing.nextRunDate;
    if (
      data.startDate !== existing.startDate &&
      existing.successCount === 0 &&
      existing.nextRunDate === existing.startDate &&
      !data.nextRunDate
    ) {
      nextRunDate = data.startDate;
    }
    if (parseDateParts(nextRunDate) === null || nextRunDate < data.startDate) {
      return {
        success: false,
        error: "Next run date must be a valid date on or after the start date.",
        fieldErrors: { nextRunDate: "Next run date must be on or after the start date." },
      };
    }

    const updated = await recurringScheduleRepository.update(organizationId, data.id, {
      id: data.id,
      organizationId,
      name: data.name,
      customerId: data.customerId ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      customerGstin: data.customerGstin || null,
      customerPlaceOfSupply: data.customerPlaceOfSupply || null,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      nextRunDate,
      timezone: data.timezone,
      status: existing.status,
      paymentTerms: data.paymentTerms,
      additionalCharges: data.additionalCharges,
      additionalChargesLabel: data.additionalChargesLabel || null,
      additionalDiscount: data.additionalDiscount,
      additionalDiscountType: data.additionalDiscountType,
      additionalDiscountLabel: data.additionalDiscountLabel || null,
      notes: data.notes || null,
      terms: data.terms || null,
      items: toSaveItems(data.items),
    });

    revalidateScheduleRoutes(updated.id);

    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};

const transitionScheduleStatus = async (
  id: string,
  operation: "pause" | "resume" | "complete" | "cancel",
  allowed: (status: RecurringSchedule["status"]) => boolean,
  nextStatus: RecurringSchedule["status"],
): Promise<RecurringActionResult<RecurringSchedule>> => {
  try {
    const { organizationId, memberRole } = await resolveRecurringScheduleContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedRecurringAccessError(
        "Only organization owners or admins can change a recurring schedule's status.",
      );
    }

    const existing = await recurringScheduleRepository.findById(organizationId, id);
    if (!existing) {
      throw new RecurringScheduleNotFoundError(id);
    }
    if (!allowed(existing.status)) {
      throw new InvalidRecurringStatusTransitionError(existing.status, operation);
    }

    await recurringScheduleRepository.updateProgress(organizationId, id, {
      status: nextStatus,
      lastResult: `Schedule ${operation}d.`,
    });

    const updated = await recurringScheduleRepository.findById(organizationId, id);
    revalidateScheduleRoutes(id);

    return { success: true, data: updated ?? existing };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};

export const pauseRecurringScheduleAction = async (
  id: string,
): Promise<RecurringActionResult<RecurringSchedule>> =>
  transitionScheduleStatus(id, "pause", canPauseSchedule, "Paused");

export const resumeRecurringScheduleAction = async (
  id: string,
): Promise<RecurringActionResult<RecurringSchedule>> =>
  transitionScheduleStatus(id, "resume", canResumeSchedule, "Active");

export const completeRecurringScheduleAction = async (
  id: string,
): Promise<RecurringActionResult<RecurringSchedule>> =>
  transitionScheduleStatus(id, "complete", canCompleteSchedule, "Completed");

export const cancelRecurringScheduleAction = async (
  id: string,
): Promise<RecurringActionResult<RecurringSchedule>> =>
  transitionScheduleStatus(id, "cancel", canCompleteSchedule, "Cancelled");

export const deleteRecurringScheduleAction = async (
  id: string,
): Promise<RecurringActionResult<{ id: string }>> => {
  try {
    const { organizationId, memberRole } = await resolveRecurringScheduleContext();
    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedRecurringAccessError(
        "Only organization owners or admins can delete recurring schedules.",
      );
    }

    const existing = await recurringScheduleRepository.findById(organizationId, id);
    if (!existing) {
      throw new RecurringScheduleNotFoundError(id);
    }

    // Only schedules with no succeeded generations may be deleted; anything
    // with financial history must be completed/cancelled instead.
    const deleted = await recurringScheduleRepository.delete(organizationId, id);
    if (deleted === 0) {
      return {
        success: false,
        error: "Schedules with generated invoices cannot be deleted. Complete or cancel the schedule instead.",
      };
    }

    revalidateScheduleRoutes();

    return { success: true, data: { id } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
