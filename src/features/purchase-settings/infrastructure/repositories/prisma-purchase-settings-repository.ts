import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type { PurchaseSettings } from "../../domain/entities/purchase-settings";
import {
  DEFAULT_PURCHASE_SETTINGS,
  formatPurchaseBillNumber,
  formatPurchaseOrderNumber,
  formatPurchaseReturnNumber,
} from "../../domain/rules/purchase-settings-rules";
import type {
  IPurchaseSettingsRepository,
  SavePurchaseSettingsInput,
  AllocatedPurchaseBillNumber,
  AllocatedPurchaseOrderNumber,
  AllocatedPurchaseReturnNumber,
} from "../../domain/repositories/purchase-settings-repository";
import { toDomainPurchaseSettings } from "../mappers/prisma-purchase-settings-mapper";

export class PrismaPurchaseSettingsRepository
  implements IPurchaseSettingsRepository
{
  async getSettings(
    organizationId: string,
    txClient?: unknown,
  ): Promise<PurchaseSettings> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const row = await prisma.purchaseSettings.findUnique({
      where: { organizationId },
    });

    if (row) {
      return toDomainPurchaseSettings(row);
    }

    const def = DEFAULT_PURCHASE_SETTINGS;
    let nextNum = def.purchaseOrderNextNumber;

    let candidate = formatPurchaseOrderNumber({
      prefix: def.purchaseOrderPrefix,
      suffix: def.purchaseOrderSuffix,
      padding: def.purchaseOrderPadding,
      nextNumber: nextNum,
    });

    while (true) {
      const existing = await prisma.purchaseOrder.findUnique({
        where: {
          organizationId_orderNumber: {
            organizationId,
            orderNumber: candidate,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextNum++;
      candidate = formatPurchaseOrderNumber({
        prefix: def.purchaseOrderPrefix,
        suffix: def.purchaseOrderSuffix,
        padding: def.purchaseOrderPadding,
        nextNumber: nextNum,
      });
    }

    let nextBillNum = def.purchaseBillNextNumber;

    let billCandidate = formatPurchaseBillNumber({
      prefix: def.purchaseBillPrefix,
      suffix: def.purchaseBillSuffix,
      padding: def.purchaseBillPadding,
      nextNumber: nextBillNum,
    });

    while (true) {
      const existing = await prisma.purchaseBill.findUnique({
        where: {
          organizationId_billNumber: {
            organizationId,
            billNumber: billCandidate,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextBillNum++;
      billCandidate = formatPurchaseBillNumber({
        prefix: def.purchaseBillPrefix,
        suffix: def.purchaseBillSuffix,
        padding: def.purchaseBillPadding,
        nextNumber: nextBillNum,
      });
    }

    let nextReturnNum = def.purchaseReturnNextNumber;

    let returnCandidate = formatPurchaseReturnNumber({
      prefix: def.purchaseReturnPrefix,
      suffix: def.purchaseReturnSuffix,
      padding: def.purchaseReturnPadding,
      nextNumber: nextReturnNum,
    });

    while (true) {
      const existing = await prisma.purchaseReturn.findUnique({
        where: {
          organizationId_returnNumber: {
            organizationId,
            returnNumber: returnCandidate,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextReturnNum++;
      returnCandidate = formatPurchaseReturnNumber({
        prefix: def.purchaseReturnPrefix,
        suffix: def.purchaseReturnSuffix,
        padding: def.purchaseReturnPadding,
        nextNumber: nextReturnNum,
      });
    }

    return {
      id: `default_purchase_settings`,
      organizationId,
      purchaseOrderPrefix: def.purchaseOrderPrefix,
      purchaseOrderSuffix: def.purchaseOrderSuffix,
      purchaseOrderNextNumber: nextNum,
      purchaseOrderPadding: def.purchaseOrderPadding,
      defaultDeliveryDays: def.defaultDeliveryDays,
      defaultPaymentTerms: def.defaultPaymentTerms,
      defaultPurchaseOrderNotes: def.defaultPurchaseOrderNotes,
      defaultPurchaseOrderTerms: def.defaultPurchaseOrderTerms,
      purchaseBillPrefix: def.purchaseBillPrefix,
      purchaseBillSuffix: def.purchaseBillSuffix,
      purchaseBillNextNumber: nextBillNum,
      purchaseBillPadding: def.purchaseBillPadding,
      defaultDueDays: def.defaultDueDays,
      defaultPurchaseBillNotes: def.defaultPurchaseBillNotes,
      defaultPurchaseBillTerms: def.defaultPurchaseBillTerms,
      purchaseReturnPrefix: def.purchaseReturnPrefix,
      purchaseReturnSuffix: def.purchaseReturnSuffix,
      purchaseReturnNextNumber: nextReturnNum,
      purchaseReturnPadding: def.purchaseReturnPadding,
      defaultPurchaseReturnReason: def.defaultPurchaseReturnReason,
      defaultPurchaseReturnNotes: def.defaultPurchaseReturnNotes,
      defaultPurchaseReturnTerms: def.defaultPurchaseReturnTerms,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async saveSettings(
    organizationId: string,
    input: SavePurchaseSettingsInput,
    txClient?: unknown,
  ): Promise<PurchaseSettings> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const def = DEFAULT_PURCHASE_SETTINGS;

    const existingRow = await prisma.purchaseSettings.findUnique({
      where: { organizationId },
    });

    const nextPurchaseOrderNumberToSet = existingRow
      ? (input.purchaseOrderNextNumber ?? existingRow.purchaseOrderNextNumber)
      : (input.purchaseOrderNextNumber ?? def.purchaseOrderNextNumber);

    if (
      input.purchaseOrderNextNumber !== undefined &&
      (!existingRow ||
        input.purchaseOrderNextNumber !== existingRow.purchaseOrderNextNumber)
    ) {
      const candidateNumber = formatPurchaseOrderNumber({
        prefix:
          input.purchaseOrderPrefix ??
          existingRow?.purchaseOrderPrefix ??
          def.purchaseOrderPrefix,
        suffix:
          input.purchaseOrderSuffix !== undefined
            ? input.purchaseOrderSuffix
            : (existingRow?.purchaseOrderSuffix ?? def.purchaseOrderSuffix),
        padding:
          input.purchaseOrderPadding ??
          existingRow?.purchaseOrderPadding ??
          def.purchaseOrderPadding,
        nextNumber: input.purchaseOrderNextNumber,
      });

      const collision = await prisma.purchaseOrder.findUnique({
        where: {
          organizationId_orderNumber: {
            organizationId,
            orderNumber: candidateNumber,
          },
        },
        select: { id: true },
      });

      if (collision) {
        throw new Error(
          `Cannot set purchase order sequence number to ${input.purchaseOrderNextNumber}: purchase order ${candidateNumber} already exists.`,
        );
      }
    }

    const nextPurchaseBillNumberToSet = existingRow
      ? (input.purchaseBillNextNumber ?? existingRow.purchaseBillNextNumber)
      : (input.purchaseBillNextNumber ?? def.purchaseBillNextNumber);

    if (
      input.purchaseBillNextNumber !== undefined &&
      (!existingRow ||
        input.purchaseBillNextNumber !== existingRow.purchaseBillNextNumber)
    ) {
      const candidateBillNumber = formatPurchaseBillNumber({
        prefix:
          input.purchaseBillPrefix ??
          existingRow?.purchaseBillPrefix ??
          def.purchaseBillPrefix,
        suffix:
          input.purchaseBillSuffix !== undefined
            ? input.purchaseBillSuffix
            : (existingRow?.purchaseBillSuffix ?? def.purchaseBillSuffix),
        padding:
          input.purchaseBillPadding ??
          existingRow?.purchaseBillPadding ??
          def.purchaseBillPadding,
        nextNumber: input.purchaseBillNextNumber,
      });

      const billCollision = await prisma.purchaseBill.findUnique({
        where: {
          organizationId_billNumber: {
            organizationId,
            billNumber: candidateBillNumber,
          },
        },
        select: { id: true },
      });

      if (billCollision) {
        throw new Error(
          `Cannot set purchase bill sequence number to ${input.purchaseBillNextNumber}: purchase bill ${candidateBillNumber} already exists.`,
        );
      }
    }

    const nextPurchaseReturnNumberToSet = existingRow
      ? (input.purchaseReturnNextNumber ?? existingRow.purchaseReturnNextNumber)
      : (input.purchaseReturnNextNumber ?? def.purchaseReturnNextNumber);

    if (
      input.purchaseReturnNextNumber !== undefined &&
      (!existingRow ||
        input.purchaseReturnNextNumber !== existingRow.purchaseReturnNextNumber)
    ) {
      const candidateReturnNumber = formatPurchaseReturnNumber({
        prefix:
          input.purchaseReturnPrefix ??
          existingRow?.purchaseReturnPrefix ??
          def.purchaseReturnPrefix,
        suffix:
          input.purchaseReturnSuffix !== undefined
            ? input.purchaseReturnSuffix
            : (existingRow?.purchaseReturnSuffix ?? def.purchaseReturnSuffix),
        padding:
          input.purchaseReturnPadding ??
          existingRow?.purchaseReturnPadding ??
          def.purchaseReturnPadding,
        nextNumber: input.purchaseReturnNextNumber,
      });

      const returnCollision = await prisma.purchaseReturn.findUnique({
        where: {
          organizationId_returnNumber: {
            organizationId,
            returnNumber: candidateReturnNumber,
          },
        },
        select: { id: true },
      });

      if (returnCollision) {
        throw new Error(
          `Cannot set purchase return sequence number to ${input.purchaseReturnNextNumber}: purchase return ${candidateReturnNumber} already exists.`,
        );
      }
    }

    const row = await prisma.purchaseSettings.upsert({
      where: { organizationId },
      create: {
        id: `pset_${crypto.randomUUID()}`,
        organizationId,
        purchaseOrderPrefix:
          input.purchaseOrderPrefix ?? def.purchaseOrderPrefix,
        purchaseOrderSuffix:
          input.purchaseOrderSuffix !== undefined
            ? input.purchaseOrderSuffix
            : def.purchaseOrderSuffix,
        purchaseOrderNextNumber: nextPurchaseOrderNumberToSet,
        purchaseOrderPadding:
          input.purchaseOrderPadding ?? def.purchaseOrderPadding,
        defaultDeliveryDays:
          input.defaultDeliveryDays ?? def.defaultDeliveryDays,
        defaultPaymentTerms:
          input.defaultPaymentTerms !== undefined
            ? input.defaultPaymentTerms
            : def.defaultPaymentTerms,
        defaultPurchaseOrderNotes:
          input.defaultPurchaseOrderNotes !== undefined
            ? input.defaultPurchaseOrderNotes
            : def.defaultPurchaseOrderNotes,
        defaultPurchaseOrderTerms:
          input.defaultPurchaseOrderTerms !== undefined
            ? input.defaultPurchaseOrderTerms
            : def.defaultPurchaseOrderTerms,
        purchaseBillPrefix:
          input.purchaseBillPrefix ?? def.purchaseBillPrefix,
        purchaseBillSuffix:
          input.purchaseBillSuffix !== undefined
            ? input.purchaseBillSuffix
            : def.purchaseBillSuffix,
        purchaseBillNextNumber: nextPurchaseBillNumberToSet,
        purchaseBillPadding:
          input.purchaseBillPadding ?? def.purchaseBillPadding,
        defaultDueDays: input.defaultDueDays ?? def.defaultDueDays,
        defaultPurchaseBillNotes:
          input.defaultPurchaseBillNotes !== undefined
            ? input.defaultPurchaseBillNotes
            : def.defaultPurchaseBillNotes,
        defaultPurchaseBillTerms:
          input.defaultPurchaseBillTerms !== undefined
            ? input.defaultPurchaseBillTerms
            : def.defaultPurchaseBillTerms,
        purchaseReturnPrefix:
          input.purchaseReturnPrefix ?? def.purchaseReturnPrefix,
        purchaseReturnSuffix:
          input.purchaseReturnSuffix !== undefined
            ? input.purchaseReturnSuffix
            : def.purchaseReturnSuffix,
        purchaseReturnNextNumber: nextPurchaseReturnNumberToSet,
        purchaseReturnPadding:
          input.purchaseReturnPadding ?? def.purchaseReturnPadding,
        defaultPurchaseReturnReason:
          input.defaultPurchaseReturnReason !== undefined
            ? input.defaultPurchaseReturnReason
            : def.defaultPurchaseReturnReason,
        defaultPurchaseReturnNotes:
          input.defaultPurchaseReturnNotes !== undefined
            ? input.defaultPurchaseReturnNotes
            : def.defaultPurchaseReturnNotes,
        defaultPurchaseReturnTerms:
          input.defaultPurchaseReturnTerms !== undefined
            ? input.defaultPurchaseReturnTerms
            : def.defaultPurchaseReturnTerms,
      },
      update: {
        ...(input.purchaseOrderPrefix !== undefined && {
          purchaseOrderPrefix: input.purchaseOrderPrefix,
        }),
        ...(input.purchaseOrderSuffix !== undefined && {
          purchaseOrderSuffix: input.purchaseOrderSuffix,
        }),
        purchaseOrderNextNumber: nextPurchaseOrderNumberToSet,
        ...(input.purchaseOrderPadding !== undefined && {
          purchaseOrderPadding: input.purchaseOrderPadding,
        }),
        ...(input.defaultDeliveryDays !== undefined && {
          defaultDeliveryDays: input.defaultDeliveryDays,
        }),
        ...(input.defaultPaymentTerms !== undefined && {
          defaultPaymentTerms: input.defaultPaymentTerms,
        }),
        ...(input.defaultPurchaseOrderNotes !== undefined && {
          defaultPurchaseOrderNotes: input.defaultPurchaseOrderNotes,
        }),
        ...(input.defaultPurchaseOrderTerms !== undefined && {
          defaultPurchaseOrderTerms: input.defaultPurchaseOrderTerms,
        }),
        ...(input.purchaseBillPrefix !== undefined && {
          purchaseBillPrefix: input.purchaseBillPrefix,
        }),
        ...(input.purchaseBillSuffix !== undefined && {
          purchaseBillSuffix: input.purchaseBillSuffix,
        }),
        purchaseBillNextNumber: nextPurchaseBillNumberToSet,
        ...(input.purchaseBillPadding !== undefined && {
          purchaseBillPadding: input.purchaseBillPadding,
        }),
        ...(input.defaultDueDays !== undefined && {
          defaultDueDays: input.defaultDueDays,
        }),
        ...(input.defaultPurchaseBillNotes !== undefined && {
          defaultPurchaseBillNotes: input.defaultPurchaseBillNotes,
        }),
        ...(input.defaultPurchaseBillTerms !== undefined && {
          defaultPurchaseBillTerms: input.defaultPurchaseBillTerms,
        }),
        ...(input.purchaseReturnPrefix !== undefined && {
          purchaseReturnPrefix: input.purchaseReturnPrefix,
        }),
        ...(input.purchaseReturnSuffix !== undefined && {
          purchaseReturnSuffix: input.purchaseReturnSuffix,
        }),
        purchaseReturnNextNumber: nextPurchaseReturnNumberToSet,
        ...(input.purchaseReturnPadding !== undefined && {
          purchaseReturnPadding: input.purchaseReturnPadding,
        }),
        ...(input.defaultPurchaseReturnReason !== undefined && {
          defaultPurchaseReturnReason: input.defaultPurchaseReturnReason,
        }),
        ...(input.defaultPurchaseReturnNotes !== undefined && {
          defaultPurchaseReturnNotes: input.defaultPurchaseReturnNotes,
        }),
        ...(input.defaultPurchaseReturnTerms !== undefined && {
          defaultPurchaseReturnTerms: input.defaultPurchaseReturnTerms,
        }),
      },
    });

    return toDomainPurchaseSettings(row);
  }

  async allocateNextPurchaseOrderNumber(
    organizationId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<AllocatedPurchaseOrderNumber> {
    const runAllocation = async (
      tx: Prisma.TransactionClient,
    ): Promise<AllocatedPurchaseOrderNumber> => {
      const def = DEFAULT_PURCHASE_SETTINGS;

      await tx.$executeRaw`
        INSERT INTO purchase_settings ("id", "organizationId", "purchaseOrderPrefix", "purchaseOrderSuffix", "purchaseOrderNextNumber", "purchaseOrderPadding", "defaultDeliveryDays", "defaultPaymentTerms", "defaultPurchaseOrderNotes", "defaultPurchaseOrderTerms", "purchaseBillPrefix", "purchaseBillSuffix", "purchaseBillNextNumber", "purchaseBillPadding", "defaultDueDays", "defaultPurchaseBillNotes", "defaultPurchaseBillTerms", "purchaseReturnPrefix", "purchaseReturnSuffix", "purchaseReturnNextNumber", "purchaseReturnPadding", "defaultPurchaseReturnReason", "defaultPurchaseReturnNotes", "defaultPurchaseReturnTerms", "createdAt", "updatedAt")
        VALUES (${`pset_${crypto.randomUUID()}`}, ${organizationId}, ${def.purchaseOrderPrefix}, ${def.purchaseOrderSuffix ?? null}, ${def.purchaseOrderNextNumber}, ${def.purchaseOrderPadding}, ${def.defaultDeliveryDays}, ${def.defaultPaymentTerms}, ${def.defaultPurchaseOrderNotes}, ${def.defaultPurchaseOrderTerms}, ${def.purchaseBillPrefix}, ${def.purchaseBillSuffix ?? null}, ${def.purchaseBillNextNumber}, ${def.purchaseBillPadding}, ${def.defaultDueDays}, ${def.defaultPurchaseBillNotes}, ${def.defaultPurchaseBillTerms}, ${def.purchaseReturnPrefix}, ${def.purchaseReturnSuffix ?? null}, ${def.purchaseReturnNextNumber}, ${def.purchaseReturnPadding}, ${def.defaultPurchaseReturnReason}, ${def.defaultPurchaseReturnNotes}, ${def.defaultPurchaseReturnTerms}, NOW(), NOW())
        ON CONFLICT ("organizationId") DO NOTHING
      `;

      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          purchaseOrderPrefix: string;
          purchaseOrderSuffix: string | null;
          purchaseOrderNextNumber: number;
          purchaseOrderPadding: number;
        }>
      >`
        SELECT "id", "purchaseOrderPrefix", "purchaseOrderSuffix", "purchaseOrderNextNumber", "purchaseOrderPadding"
        FROM purchase_settings
        WHERE "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      const record = lockedRows[0];
      if (!record) {
        throw new Error(
          `Failed to locate and lock purchase settings for ${organizationId}`,
        );
      }

      let currentSeq = record.purchaseOrderNextNumber;
      let candidateNumber = formatPurchaseOrderNumber({
        prefix: record.purchaseOrderPrefix,
        suffix: record.purchaseOrderSuffix,
        padding: record.purchaseOrderPadding,
        nextNumber: currentSeq,
      });

      while (true) {
        const existing = await tx.purchaseOrder.findUnique({
          where: {
            organizationId_orderNumber: {
              organizationId,
              orderNumber: candidateNumber,
            },
          },
          select: { id: true },
        });

        if (!existing) {
          break;
        }

        currentSeq++;
        candidateNumber = formatPurchaseOrderNumber({
          prefix: record.purchaseOrderPrefix,
          suffix: record.purchaseOrderSuffix,
          padding: record.purchaseOrderPadding,
          nextNumber: currentSeq,
        });
      }

      const nextSequence = currentSeq + 1;
      await tx.purchaseSettings.update({
        where: { organizationId },
        data: {
          purchaseOrderNextNumber: nextSequence,
        },
      });

      return {
        allocatedNumber: candidateNumber,
        sequenceNumber: currentSeq,
      };
    };

    if (txClient) {
      return runAllocation(txClient);
    }

    const prisma = getPrisma();
    return prisma.$transaction((tx) => runAllocation(tx));
  }

  async allocateNextPurchaseBillNumber(
    organizationId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<AllocatedPurchaseBillNumber> {
    const runAllocation = async (
      tx: Prisma.TransactionClient,
    ): Promise<AllocatedPurchaseBillNumber> => {
      const def = DEFAULT_PURCHASE_SETTINGS;

      await tx.$executeRaw`
        INSERT INTO purchase_settings ("id", "organizationId", "purchaseOrderPrefix", "purchaseOrderSuffix", "purchaseOrderNextNumber", "purchaseOrderPadding", "defaultDeliveryDays", "defaultPaymentTerms", "defaultPurchaseOrderNotes", "defaultPurchaseOrderTerms", "purchaseBillPrefix", "purchaseBillSuffix", "purchaseBillNextNumber", "purchaseBillPadding", "defaultDueDays", "defaultPurchaseBillNotes", "defaultPurchaseBillTerms", "purchaseReturnPrefix", "purchaseReturnSuffix", "purchaseReturnNextNumber", "purchaseReturnPadding", "defaultPurchaseReturnReason", "defaultPurchaseReturnNotes", "defaultPurchaseReturnTerms", "createdAt", "updatedAt")
        VALUES (${`pset_${crypto.randomUUID()}`}, ${organizationId}, ${def.purchaseOrderPrefix}, ${def.purchaseOrderSuffix ?? null}, ${def.purchaseOrderNextNumber}, ${def.purchaseOrderPadding}, ${def.defaultDeliveryDays}, ${def.defaultPaymentTerms}, ${def.defaultPurchaseOrderNotes}, ${def.defaultPurchaseOrderTerms}, ${def.purchaseBillPrefix}, ${def.purchaseBillSuffix ?? null}, ${def.purchaseBillNextNumber}, ${def.purchaseBillPadding}, ${def.defaultDueDays}, ${def.defaultPurchaseBillNotes}, ${def.defaultPurchaseBillTerms}, ${def.purchaseReturnPrefix}, ${def.purchaseReturnSuffix ?? null}, ${def.purchaseReturnNextNumber}, ${def.purchaseReturnPadding}, ${def.defaultPurchaseReturnReason}, ${def.defaultPurchaseReturnNotes}, ${def.defaultPurchaseReturnTerms}, NOW(), NOW())
        ON CONFLICT ("organizationId") DO NOTHING
      `;

      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          purchaseBillPrefix: string;
          purchaseBillSuffix: string | null;
          purchaseBillNextNumber: number;
          purchaseBillPadding: number;
        }>
      >`
        SELECT "id", "purchaseBillPrefix", "purchaseBillSuffix", "purchaseBillNextNumber", "purchaseBillPadding"
        FROM purchase_settings
        WHERE "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      const record = lockedRows[0];
      if (!record) {
        throw new Error(
          `Failed to locate and lock purchase settings for ${organizationId}`,
        );
      }

      let currentSeq = record.purchaseBillNextNumber;
      let candidateNumber = formatPurchaseBillNumber({
        prefix: record.purchaseBillPrefix,
        suffix: record.purchaseBillSuffix,
        padding: record.purchaseBillPadding,
        nextNumber: currentSeq,
      });

      while (true) {
        const existing = await tx.purchaseBill.findUnique({
          where: {
            organizationId_billNumber: {
              organizationId,
              billNumber: candidateNumber,
            },
          },
          select: { id: true },
        });

        if (!existing) {
          break;
        }

        currentSeq++;
        candidateNumber = formatPurchaseBillNumber({
          prefix: record.purchaseBillPrefix,
          suffix: record.purchaseBillSuffix,
          padding: record.purchaseBillPadding,
          nextNumber: currentSeq,
        });
      }

      const nextSequence = currentSeq + 1;
      await tx.purchaseSettings.update({
        where: { organizationId },
        data: {
          purchaseBillNextNumber: nextSequence,
        },
      });

      return {
        allocatedNumber: candidateNumber,
        sequenceNumber: currentSeq,
      };
    };

    if (txClient) {
      return runAllocation(txClient);
    }

    const prisma = getPrisma();
    return prisma.$transaction((tx) => runAllocation(tx));
  }

  async allocateNextPurchaseReturnNumber(
    organizationId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<AllocatedPurchaseReturnNumber> {
    const runAllocation = async (
      tx: Prisma.TransactionClient,
    ): Promise<AllocatedPurchaseReturnNumber> => {
      const def = DEFAULT_PURCHASE_SETTINGS;

      await tx.$executeRaw`
        INSERT INTO purchase_settings ("id", "organizationId", "purchaseOrderPrefix", "purchaseOrderSuffix", "purchaseOrderNextNumber", "purchaseOrderPadding", "defaultDeliveryDays", "defaultPaymentTerms", "defaultPurchaseOrderNotes", "defaultPurchaseOrderTerms", "purchaseBillPrefix", "purchaseBillSuffix", "purchaseBillNextNumber", "purchaseBillPadding", "defaultDueDays", "defaultPurchaseBillNotes", "defaultPurchaseBillTerms", "purchaseReturnPrefix", "purchaseReturnSuffix", "purchaseReturnNextNumber", "purchaseReturnPadding", "defaultPurchaseReturnReason", "defaultPurchaseReturnNotes", "defaultPurchaseReturnTerms", "createdAt", "updatedAt")
        VALUES (${`pset_${crypto.randomUUID()}`}, ${organizationId}, ${def.purchaseOrderPrefix}, ${def.purchaseOrderSuffix ?? null}, ${def.purchaseOrderNextNumber}, ${def.purchaseOrderPadding}, ${def.defaultDeliveryDays}, ${def.defaultPaymentTerms}, ${def.defaultPurchaseOrderNotes}, ${def.defaultPurchaseOrderTerms}, ${def.purchaseBillPrefix}, ${def.purchaseBillSuffix ?? null}, ${def.purchaseBillNextNumber}, ${def.purchaseBillPadding}, ${def.defaultDueDays}, ${def.defaultPurchaseBillNotes}, ${def.defaultPurchaseBillTerms}, ${def.purchaseReturnPrefix}, ${def.purchaseReturnSuffix ?? null}, ${def.purchaseReturnNextNumber}, ${def.purchaseReturnPadding}, ${def.defaultPurchaseReturnReason}, ${def.defaultPurchaseReturnNotes}, ${def.defaultPurchaseReturnTerms}, NOW(), NOW())
        ON CONFLICT ("organizationId") DO NOTHING
      `;

      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          purchaseReturnPrefix: string;
          purchaseReturnSuffix: string | null;
          purchaseReturnNextNumber: number;
          purchaseReturnPadding: number;
        }>
      >`
        SELECT "id", "purchaseReturnPrefix", "purchaseReturnSuffix", "purchaseReturnNextNumber", "purchaseReturnPadding"
        FROM purchase_settings
        WHERE "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      const record = lockedRows[0];
      if (!record) {
        throw new Error(
          `Failed to locate and lock purchase settings for ${organizationId}`,
        );
      }

      let currentSeq = record.purchaseReturnNextNumber;
      let candidateNumber = formatPurchaseReturnNumber({
        prefix: record.purchaseReturnPrefix,
        suffix: record.purchaseReturnSuffix,
        padding: record.purchaseReturnPadding,
        nextNumber: currentSeq,
      });

      while (true) {
        const existing = await tx.purchaseReturn.findUnique({
          where: {
            organizationId_returnNumber: {
              organizationId,
              returnNumber: candidateNumber,
            },
          },
          select: { id: true },
        });

        if (!existing) {
          break;
        }

        currentSeq++;
        candidateNumber = formatPurchaseReturnNumber({
          prefix: record.purchaseReturnPrefix,
          suffix: record.purchaseReturnSuffix,
          padding: record.purchaseReturnPadding,
          nextNumber: currentSeq,
        });
      }

      const nextSequence = currentSeq + 1;
      await tx.purchaseSettings.update({
        where: { organizationId },
        data: {
          purchaseReturnNextNumber: nextSequence,
        },
      });

      return {
        allocatedNumber: candidateNumber,
        sequenceNumber: currentSeq,
      };
    };

    if (txClient) {
      return runAllocation(txClient);
    }

    const prisma = getPrisma();
    return prisma.$transaction((tx) => runAllocation(tx));
  }
}

export const purchaseSettingsRepository = new PrismaPurchaseSettingsRepository();
