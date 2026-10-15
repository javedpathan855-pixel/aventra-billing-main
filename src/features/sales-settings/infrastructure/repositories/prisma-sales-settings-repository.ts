import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type { SalesSettings } from "../../domain/entities/sales-settings";
import {
  DEFAULT_SALES_SETTINGS,
  formatEstimateNumber,
  formatSalesOrderNumber,
  formatDeliveryChallanNumber,
  formatSalesReturnNumber,
} from "../../domain/rules/sales-settings-rules";
import type {
  ISalesSettingsRepository,
  SaveSalesSettingsInput,
  AllocatedEstimateNumber,
  AllocatedSalesOrderNumber,
  AllocatedDeliveryChallanNumber,
  AllocatedSalesReturnNumber,
} from "../../domain/repositories/sales-settings-repository";
import { toDomainSalesSettings } from "../mappers/prisma-sales-settings-mapper";

export class PrismaSalesSettingsRepository implements ISalesSettingsRepository {
  async getSettings(
    organizationId: string,
    txClient?: unknown,
  ): Promise<SalesSettings> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const row = await prisma.salesSettings.findUnique({
      where: { organizationId },
    });

    if (row) {
      return toDomainSalesSettings(row);
    }

    const def = DEFAULT_SALES_SETTINGS;
    let nextNum = def.estimateNextNumber;

    let candidate = formatEstimateNumber({
      prefix: def.estimatePrefix,
      suffix: def.estimateSuffix,
      padding: def.estimatePadding,
      nextNumber: nextNum,
    });

    while (true) {
      const existing = await prisma.estimate.findUnique({
        where: {
          organizationId_estimateNumber: {
            organizationId,
            estimateNumber: candidate,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextNum++;
      candidate = formatEstimateNumber({
        prefix: def.estimatePrefix,
        suffix: def.estimateSuffix,
        padding: def.estimatePadding,
        nextNumber: nextNum,
      });
    }

    let nextSoNum = def.salesOrderNextNumber;
    let candidateSo = formatSalesOrderNumber({
      prefix: def.salesOrderPrefix,
      suffix: def.salesOrderSuffix,
      padding: def.salesOrderPadding,
      nextNumber: nextSoNum,
    });

    while (true) {
      const existing = await prisma.salesOrder.findUnique({
        where: {
          organizationId_orderNumber: {
            organizationId,
            orderNumber: candidateSo,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextSoNum++;
      candidateSo = formatSalesOrderNumber({
        prefix: def.salesOrderPrefix,
        suffix: def.salesOrderSuffix,
        padding: def.salesOrderPadding,
        nextNumber: nextSoNum,
      });
    }

    let nextDcNum = def.deliveryChallanNextNumber;
    let candidateDc = formatDeliveryChallanNumber({
      prefix: def.deliveryChallanPrefix,
      suffix: def.deliveryChallanSuffix,
      padding: def.deliveryChallanPadding,
      nextNumber: nextDcNum,
    });

    while (true) {
      const existing = await prisma.deliveryChallan.findUnique({
        where: {
          organizationId_challanNumber: {
            organizationId,
            challanNumber: candidateDc,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextDcNum++;
      candidateDc = formatDeliveryChallanNumber({
        prefix: def.deliveryChallanPrefix,
        suffix: def.deliveryChallanSuffix,
        padding: def.deliveryChallanPadding,
        nextNumber: nextDcNum,
      });
    }

    let nextSrNum = def.salesReturnNextNumber;
    let candidateSr = formatSalesReturnNumber({
      prefix: def.salesReturnPrefix,
      suffix: def.salesReturnSuffix,
      padding: def.salesReturnPadding,
      nextNumber: nextSrNum,
    });

    while (true) {
      const existing = await prisma.salesReturn.findUnique({
        where: {
          organizationId_returnNumber: {
            organizationId,
            returnNumber: candidateSr,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        break;
      }

      nextSrNum++;
      candidateSr = formatSalesReturnNumber({
        prefix: def.salesReturnPrefix,
        suffix: def.salesReturnSuffix,
        padding: def.salesReturnPadding,
        nextNumber: nextSrNum,
      });
    }

    return {
      id: `default_sales_settings`,
      organizationId,
      estimatePrefix: def.estimatePrefix,
      estimateSuffix: def.estimateSuffix,
      estimateNextNumber: nextNum,
      estimatePadding: def.estimatePadding,
      salesOrderPrefix: def.salesOrderPrefix,
      salesOrderSuffix: def.salesOrderSuffix,
      salesOrderNextNumber: nextSoNum,
      salesOrderPadding: def.salesOrderPadding,
      deliveryChallanPrefix: def.deliveryChallanPrefix,
      deliveryChallanSuffix: def.deliveryChallanSuffix,
      deliveryChallanNextNumber: nextDcNum,
      deliveryChallanPadding: def.deliveryChallanPadding,
      salesReturnPrefix: def.salesReturnPrefix,
      salesReturnSuffix: def.salesReturnSuffix,
      salesReturnNextNumber: nextSrNum,
      salesReturnPadding: def.salesReturnPadding,
      defaultValidityDays: def.defaultValidityDays,
      defaultDeliveryDays: def.defaultDeliveryDays,
      defaultNotes: def.defaultNotes,
      defaultTerms: def.defaultTerms,
      defaultSalesOrderNotes: def.defaultSalesOrderNotes,
      defaultSalesOrderTerms: def.defaultSalesOrderTerms,
      defaultDeliveryInstructions: def.defaultDeliveryInstructions,
      defaultDeliveryTerms: def.defaultDeliveryTerms,
      defaultReturnReason: def.defaultReturnReason,
      defaultReturnPolicy: def.defaultReturnPolicy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async saveSettings(
    organizationId: string,
    input: SaveSalesSettingsInput,
    txClient?: unknown,
  ): Promise<SalesSettings> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const def = DEFAULT_SALES_SETTINGS;

    const existingRow = await prisma.salesSettings.findUnique({
      where: { organizationId },
    });

    const nextEstimateNumberToSet =
      existingRow
        ? input.estimateNextNumber ?? existingRow.estimateNextNumber
        : (input.estimateNextNumber ?? def.estimateNextNumber);

    if (
      input.estimateNextNumber !== undefined &&
      (!existingRow || input.estimateNextNumber !== existingRow.estimateNextNumber)
    ) {
      const candidateNumber = formatEstimateNumber({
        prefix: input.estimatePrefix ?? existingRow?.estimatePrefix ?? def.estimatePrefix,
        suffix:
          input.estimateSuffix !== undefined
            ? input.estimateSuffix
            : existingRow?.estimateSuffix ?? def.estimateSuffix,
        padding: input.estimatePadding ?? existingRow?.estimatePadding ?? def.estimatePadding,
        nextNumber: input.estimateNextNumber,
      });

      const collision = await prisma.estimate.findUnique({
        where: {
          organizationId_estimateNumber: {
            organizationId,
            estimateNumber: candidateNumber,
          },
        },
        select: { id: true },
      });

      if (collision) {
        throw new Error(
          `Cannot set estimate sequence number to ${input.estimateNextNumber}: estimate ${candidateNumber} already exists.`,
        );
      }
    }

    const nextSalesOrderNumberToSet =
      existingRow
        ? input.salesOrderNextNumber ?? existingRow.salesOrderNextNumber
        : (input.salesOrderNextNumber ?? def.salesOrderNextNumber);

    if (
      input.salesOrderNextNumber !== undefined &&
      (!existingRow || input.salesOrderNextNumber !== existingRow.salesOrderNextNumber)
    ) {
      const candidateSoNumber = formatSalesOrderNumber({
        prefix: input.salesOrderPrefix ?? existingRow?.salesOrderPrefix ?? def.salesOrderPrefix,
        suffix:
          input.salesOrderSuffix !== undefined
            ? input.salesOrderSuffix
            : existingRow?.salesOrderSuffix ?? def.salesOrderSuffix,
        padding: input.salesOrderPadding ?? existingRow?.salesOrderPadding ?? def.salesOrderPadding,
        nextNumber: input.salesOrderNextNumber,
      });

      const collisionSo = await prisma.salesOrder.findUnique({
        where: {
          organizationId_orderNumber: {
            organizationId,
            orderNumber: candidateSoNumber,
          },
        },
        select: { id: true },
      });

      if (collisionSo) {
        throw new Error(
          `Cannot set sales order sequence number to ${input.salesOrderNextNumber}: sales order ${candidateSoNumber} already exists.`,
        );
      }
    }

    const nextDeliveryChallanNumberToSet =
      existingRow
        ? input.deliveryChallanNextNumber ?? existingRow.deliveryChallanNextNumber
        : (input.deliveryChallanNextNumber ?? def.deliveryChallanNextNumber);

    if (
      input.deliveryChallanNextNumber !== undefined &&
      (!existingRow || input.deliveryChallanNextNumber !== existingRow.deliveryChallanNextNumber)
    ) {
      const candidateDcNumber = formatDeliveryChallanNumber({
        prefix: input.deliveryChallanPrefix ?? existingRow?.deliveryChallanPrefix ?? def.deliveryChallanPrefix,
        suffix:
          input.deliveryChallanSuffix !== undefined
            ? input.deliveryChallanSuffix
            : existingRow?.deliveryChallanSuffix ?? def.deliveryChallanSuffix,
        padding: input.deliveryChallanPadding ?? existingRow?.deliveryChallanPadding ?? def.deliveryChallanPadding,
        nextNumber: input.deliveryChallanNextNumber,
      });

      const collisionDc = await prisma.deliveryChallan.findUnique({
        where: {
          organizationId_challanNumber: {
            organizationId,
            challanNumber: candidateDcNumber,
          },
        },
        select: { id: true },
      });

      if (collisionDc) {
        throw new Error(
          `Cannot set delivery challan sequence number to ${input.deliveryChallanNextNumber}: delivery challan ${candidateDcNumber} already exists.`,
        );
      }
    }

    const nextSalesReturnNumberToSet =
      existingRow
        ? input.salesReturnNextNumber ?? existingRow.salesReturnNextNumber
        : (input.salesReturnNextNumber ?? def.salesReturnNextNumber);

    if (
      input.salesReturnNextNumber !== undefined &&
      (!existingRow || input.salesReturnNextNumber !== existingRow.salesReturnNextNumber)
    ) {
      const candidateSrNumber = formatSalesReturnNumber({
        prefix: input.salesReturnPrefix ?? existingRow?.salesReturnPrefix ?? def.salesReturnPrefix,
        suffix:
          input.salesReturnSuffix !== undefined
            ? input.salesReturnSuffix
            : existingRow?.salesReturnSuffix ?? def.salesReturnSuffix,
        padding: input.salesReturnPadding ?? existingRow?.salesReturnPadding ?? def.salesReturnPadding,
        nextNumber: input.salesReturnNextNumber,
      });

      const collisionSr = await prisma.salesReturn.findUnique({
        where: {
          organizationId_returnNumber: {
            organizationId,
            returnNumber: candidateSrNumber,
          },
        },
        select: { id: true },
      });

      if (collisionSr) {
        throw new Error(
          `Cannot set sales return sequence number to ${input.salesReturnNextNumber}: sales return ${candidateSrNumber} already exists.`,
        );
      }
    }

    const row = await prisma.salesSettings.upsert({
      where: { organizationId },
      create: {
        id: `sset_${crypto.randomUUID()}`,
        organizationId,
        estimatePrefix: input.estimatePrefix ?? def.estimatePrefix,
        estimateSuffix: input.estimateSuffix ?? def.estimateSuffix,
        estimateNextNumber: nextEstimateNumberToSet,
        estimatePadding: input.estimatePadding ?? def.estimatePadding,
        salesOrderPrefix: input.salesOrderPrefix ?? def.salesOrderPrefix,
        salesOrderSuffix: input.salesOrderSuffix ?? def.salesOrderSuffix,
        salesOrderNextNumber: nextSalesOrderNumberToSet,
        salesOrderPadding: input.salesOrderPadding ?? def.salesOrderPadding,
        deliveryChallanPrefix: input.deliveryChallanPrefix ?? def.deliveryChallanPrefix,
        deliveryChallanSuffix: input.deliveryChallanSuffix ?? def.deliveryChallanSuffix,
        deliveryChallanNextNumber: nextDeliveryChallanNumberToSet,
        deliveryChallanPadding: input.deliveryChallanPadding ?? def.deliveryChallanPadding,
        salesReturnPrefix: input.salesReturnPrefix ?? def.salesReturnPrefix,
        salesReturnSuffix: input.salesReturnSuffix ?? def.salesReturnSuffix,
        salesReturnNextNumber: nextSalesReturnNumberToSet,
        salesReturnPadding: input.salesReturnPadding ?? def.salesReturnPadding,
        defaultValidityDays: input.defaultValidityDays ?? def.defaultValidityDays,
        defaultDeliveryDays: input.defaultDeliveryDays ?? def.defaultDeliveryDays,
        defaultNotes:
          input.defaultNotes !== undefined ? input.defaultNotes : def.defaultNotes,
        defaultTerms:
          input.defaultTerms !== undefined ? input.defaultTerms : def.defaultTerms,
        defaultSalesOrderNotes:
          input.defaultSalesOrderNotes !== undefined
            ? input.defaultSalesOrderNotes
            : def.defaultSalesOrderNotes,
        defaultSalesOrderTerms:
          input.defaultSalesOrderTerms !== undefined
            ? input.defaultSalesOrderTerms
            : def.defaultSalesOrderTerms,
        defaultDeliveryInstructions:
          input.defaultDeliveryInstructions !== undefined
            ? input.defaultDeliveryInstructions
            : def.defaultDeliveryInstructions,
        defaultDeliveryTerms:
          input.defaultDeliveryTerms !== undefined
            ? input.defaultDeliveryTerms
            : def.defaultDeliveryTerms,
        defaultReturnReason:
          input.defaultReturnReason !== undefined
            ? input.defaultReturnReason
            : def.defaultReturnReason,
        defaultReturnPolicy:
          input.defaultReturnPolicy !== undefined
            ? input.defaultReturnPolicy
            : def.defaultReturnPolicy,
      },
      update: {
        ...(input.estimatePrefix !== undefined && {
          estimatePrefix: input.estimatePrefix,
        }),
        ...(input.estimateSuffix !== undefined && {
          estimateSuffix: input.estimateSuffix,
        }),
        estimateNextNumber: nextEstimateNumberToSet,
        ...(input.estimatePadding !== undefined && {
          estimatePadding: input.estimatePadding,
        }),
        ...(input.salesOrderPrefix !== undefined && {
          salesOrderPrefix: input.salesOrderPrefix,
        }),
        ...(input.salesOrderSuffix !== undefined && {
          salesOrderSuffix: input.salesOrderSuffix,
        }),
        salesOrderNextNumber: nextSalesOrderNumberToSet,
        ...(input.salesOrderPadding !== undefined && {
          salesOrderPadding: input.salesOrderPadding,
        }),
        ...(input.deliveryChallanPrefix !== undefined && {
          deliveryChallanPrefix: input.deliveryChallanPrefix,
        }),
        ...(input.deliveryChallanSuffix !== undefined && {
          deliveryChallanSuffix: input.deliveryChallanSuffix,
        }),
        deliveryChallanNextNumber: nextDeliveryChallanNumberToSet,
        ...(input.deliveryChallanPadding !== undefined && {
          deliveryChallanPadding: input.deliveryChallanPadding,
        }),
        ...(input.salesReturnPrefix !== undefined && {
          salesReturnPrefix: input.salesReturnPrefix,
        }),
        ...(input.salesReturnSuffix !== undefined && {
          salesReturnSuffix: input.salesReturnSuffix,
        }),
        salesReturnNextNumber: nextSalesReturnNumberToSet,
        ...(input.salesReturnPadding !== undefined && {
          salesReturnPadding: input.salesReturnPadding,
        }),
        ...(input.defaultValidityDays !== undefined && {
          defaultValidityDays: input.defaultValidityDays,
        }),
        ...(input.defaultDeliveryDays !== undefined && {
          defaultDeliveryDays: input.defaultDeliveryDays,
        }),
        ...(input.defaultNotes !== undefined && {
          defaultNotes: input.defaultNotes,
        }),
        ...(input.defaultTerms !== undefined && {
          defaultTerms: input.defaultTerms,
        }),
        ...(input.defaultSalesOrderNotes !== undefined && {
          defaultSalesOrderNotes: input.defaultSalesOrderNotes,
        }),
        ...(input.defaultSalesOrderTerms !== undefined && {
          defaultSalesOrderTerms: input.defaultSalesOrderTerms,
        }),
        ...(input.defaultDeliveryInstructions !== undefined && {
          defaultDeliveryInstructions: input.defaultDeliveryInstructions,
        }),
        ...(input.defaultDeliveryTerms !== undefined && {
          defaultDeliveryTerms: input.defaultDeliveryTerms,
        }),
        ...(input.defaultReturnReason !== undefined && {
          defaultReturnReason: input.defaultReturnReason,
        }),
        ...(input.defaultReturnPolicy !== undefined && {
          defaultReturnPolicy: input.defaultReturnPolicy,
        }),
      },
    });

    return toDomainSalesSettings(row);
  }

  async allocateNextNumber(
    organizationId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<AllocatedEstimateNumber> {
    const runAllocation = async (
      tx: Prisma.TransactionClient,
    ): Promise<AllocatedEstimateNumber> => {
      const def = DEFAULT_SALES_SETTINGS;

      // 1. Ensure a sales_settings row exists atomically
      await tx.$executeRaw`
        INSERT INTO sales_settings ("id", "organizationId", "estimatePrefix", "estimateSuffix", "estimateNextNumber", "estimatePadding", "salesOrderPrefix", "salesOrderSuffix", "salesOrderNextNumber", "salesOrderPadding", "defaultValidityDays", "defaultDeliveryDays", "defaultNotes", "defaultTerms", "defaultSalesOrderNotes", "defaultSalesOrderTerms", "createdAt", "updatedAt")
        VALUES (${`sset_${crypto.randomUUID()}`}, ${organizationId}, ${def.estimatePrefix}, ${def.estimateSuffix ?? null}, ${def.estimateNextNumber}, ${def.estimatePadding}, ${def.salesOrderPrefix}, ${def.salesOrderSuffix ?? null}, ${def.salesOrderNextNumber}, ${def.salesOrderPadding}, ${def.defaultValidityDays}, ${def.defaultDeliveryDays}, ${def.defaultNotes}, ${def.defaultTerms}, ${def.defaultSalesOrderNotes}, ${def.defaultSalesOrderTerms}, NOW(), NOW())
        ON CONFLICT ("organizationId") DO NOTHING
      `;

      // 2. Lock the sales_settings row exclusively with FOR UPDATE
      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          estimatePrefix: string;
          estimateSuffix: string | null;
          estimateNextNumber: number;
          estimatePadding: number;
        }>
      >`
        SELECT "id", "estimatePrefix", "estimateSuffix", "estimateNextNumber", "estimatePadding"
        FROM sales_settings
        WHERE "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      const record = lockedRows[0];
      if (!record) {
        throw new Error(
          `Failed to locate and lock sales settings for ${organizationId}`,
        );
      }

      // 3. Collision-skip loop against existing estimates
      let currentSeq = record.estimateNextNumber;
      let candidateNumber = formatEstimateNumber({
        prefix: record.estimatePrefix,
        suffix: record.estimateSuffix,
        padding: record.estimatePadding,
        nextNumber: currentSeq,
      });

      while (true) {
        const existing = await tx.estimate.findUnique({
          where: {
            organizationId_estimateNumber: {
              organizationId,
              estimateNumber: candidateNumber,
            },
          },
          select: { id: true },
        });

        if (!existing) {
          break;
        }

        currentSeq++;
        candidateNumber = formatEstimateNumber({
          prefix: record.estimatePrefix,
          suffix: record.estimateSuffix,
          padding: record.estimatePadding,
          nextNumber: currentSeq,
        });
      }

      // 4. Update next sequence
      const nextSequence = currentSeq + 1;
      await tx.salesSettings.update({
        where: { organizationId },
        data: {
          estimateNextNumber: nextSequence,
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

  async allocateNextSalesOrderNumber(
    organizationId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<AllocatedSalesOrderNumber> {
    const runAllocation = async (
      tx: Prisma.TransactionClient,
    ): Promise<AllocatedSalesOrderNumber> => {
      const def = DEFAULT_SALES_SETTINGS;

      // 1. Ensure a sales_settings row exists atomically
      await tx.$executeRaw`
        INSERT INTO sales_settings ("id", "organizationId", "estimatePrefix", "estimateSuffix", "estimateNextNumber", "estimatePadding", "salesOrderPrefix", "salesOrderSuffix", "salesOrderNextNumber", "salesOrderPadding", "defaultValidityDays", "defaultDeliveryDays", "defaultNotes", "defaultTerms", "defaultSalesOrderNotes", "defaultSalesOrderTerms", "createdAt", "updatedAt")
        VALUES (${`sset_${crypto.randomUUID()}`}, ${organizationId}, ${def.estimatePrefix}, ${def.estimateSuffix ?? null}, ${def.estimateNextNumber}, ${def.estimatePadding}, ${def.salesOrderPrefix}, ${def.salesOrderSuffix ?? null}, ${def.salesOrderNextNumber}, ${def.salesOrderPadding}, ${def.defaultValidityDays}, ${def.defaultDeliveryDays}, ${def.defaultNotes}, ${def.defaultTerms}, ${def.defaultSalesOrderNotes}, ${def.defaultSalesOrderTerms}, NOW(), NOW())
        ON CONFLICT ("organizationId") DO NOTHING
      `;

      // 2. Lock the sales_settings row exclusively with FOR UPDATE
      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          salesOrderPrefix: string;
          salesOrderSuffix: string | null;
          salesOrderNextNumber: number;
          salesOrderPadding: number;
        }>
      >`
        SELECT "id", "salesOrderPrefix", "salesOrderSuffix", "salesOrderNextNumber", "salesOrderPadding"
        FROM sales_settings
        WHERE "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      const record = lockedRows[0];
      if (!record) {
        throw new Error(
          `Failed to locate and lock sales settings for ${organizationId}`,
        );
      }

      // 3. Collision-skip loop against existing sales orders
      let currentSeq = record.salesOrderNextNumber;
      let candidateNumber = formatSalesOrderNumber({
        prefix: record.salesOrderPrefix,
        suffix: record.salesOrderSuffix,
        padding: record.salesOrderPadding,
        nextNumber: currentSeq,
      });

      while (true) {
        const existing = await tx.salesOrder.findUnique({
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
        candidateNumber = formatSalesOrderNumber({
          prefix: record.salesOrderPrefix,
          suffix: record.salesOrderSuffix,
          padding: record.salesOrderPadding,
          nextNumber: currentSeq,
        });
      }

      // 4. Update next sequence
      const nextSequence = currentSeq + 1;
      await tx.salesSettings.update({
        where: { organizationId },
        data: {
          salesOrderNextNumber: nextSequence,
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

  async allocateNextDeliveryChallanNumber(
    organizationId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<AllocatedDeliveryChallanNumber> {
    const runAllocation = async (
      tx: Prisma.TransactionClient,
    ): Promise<AllocatedDeliveryChallanNumber> => {
      const def = DEFAULT_SALES_SETTINGS;

      // 1. Ensure a sales_settings row exists atomically
      await tx.$executeRaw`
        INSERT INTO sales_settings ("id", "organizationId", "estimatePrefix", "estimateSuffix", "estimateNextNumber", "estimatePadding", "salesOrderPrefix", "salesOrderSuffix", "salesOrderNextNumber", "salesOrderPadding", "deliveryChallanPrefix", "deliveryChallanSuffix", "deliveryChallanNextNumber", "deliveryChallanPadding", "salesReturnPrefix", "salesReturnSuffix", "salesReturnNextNumber", "salesReturnPadding", "defaultValidityDays", "defaultDeliveryDays", "defaultNotes", "defaultTerms", "defaultSalesOrderNotes", "defaultSalesOrderTerms", "defaultDeliveryInstructions", "defaultDeliveryTerms", "defaultReturnReason", "defaultReturnPolicy", "createdAt", "updatedAt")
        VALUES (${`sset_${crypto.randomUUID()}`}, ${organizationId}, ${def.estimatePrefix}, ${def.estimateSuffix ?? null}, ${def.estimateNextNumber}, ${def.estimatePadding}, ${def.salesOrderPrefix}, ${def.salesOrderSuffix ?? null}, ${def.salesOrderNextNumber}, ${def.salesOrderPadding}, ${def.deliveryChallanPrefix}, ${def.deliveryChallanSuffix ?? null}, ${def.deliveryChallanNextNumber}, ${def.deliveryChallanPadding}, ${def.salesReturnPrefix}, ${def.salesReturnSuffix ?? null}, ${def.salesReturnNextNumber}, ${def.salesReturnPadding}, ${def.defaultValidityDays}, ${def.defaultDeliveryDays}, ${def.defaultNotes}, ${def.defaultTerms}, ${def.defaultSalesOrderNotes}, ${def.defaultSalesOrderTerms}, ${def.defaultDeliveryInstructions}, ${def.defaultDeliveryTerms}, ${def.defaultReturnReason}, ${def.defaultReturnPolicy}, NOW(), NOW())
        ON CONFLICT ("organizationId") DO NOTHING
      `;

      // 2. Lock the sales_settings row exclusively with FOR UPDATE
      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          deliveryChallanPrefix: string;
          deliveryChallanSuffix: string | null;
          deliveryChallanNextNumber: number;
          deliveryChallanPadding: number;
        }>
      >`
        SELECT "id", "deliveryChallanPrefix", "deliveryChallanSuffix", "deliveryChallanNextNumber", "deliveryChallanPadding"
        FROM sales_settings
        WHERE "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      const record = lockedRows[0];
      if (!record) {
        throw new Error(
          `Failed to locate and lock sales settings for ${organizationId}`,
        );
      }

      // 3. Collision-skip loop against existing delivery challans
      let currentSeq = record.deliveryChallanNextNumber;
      let candidateNumber = formatDeliveryChallanNumber({
        prefix: record.deliveryChallanPrefix,
        suffix: record.deliveryChallanSuffix,
        padding: record.deliveryChallanPadding,
        nextNumber: currentSeq,
      });

      while (true) {
        const existing = await tx.deliveryChallan.findUnique({
          where: {
            organizationId_challanNumber: {
              organizationId,
              challanNumber: candidateNumber,
            },
          },
          select: { id: true },
        });

        if (!existing) {
          break;
        }

        currentSeq++;
        candidateNumber = formatDeliveryChallanNumber({
          prefix: record.deliveryChallanPrefix,
          suffix: record.deliveryChallanSuffix,
          padding: record.deliveryChallanPadding,
          nextNumber: currentSeq,
        });
      }

      // 4. Update next sequence
      const nextSequence = currentSeq + 1;
      await tx.salesSettings.update({
        where: { organizationId },
        data: {
          deliveryChallanNextNumber: nextSequence,
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

  async allocateNextSalesReturnNumber(
    organizationId: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<AllocatedSalesReturnNumber> {
    const runAllocation = async (
      tx: Prisma.TransactionClient,
    ): Promise<AllocatedSalesReturnNumber> => {
      const def = DEFAULT_SALES_SETTINGS;

      // 1. Ensure a sales_settings row exists atomically
      await tx.$executeRaw`
        INSERT INTO sales_settings ("id", "organizationId", "estimatePrefix", "estimateSuffix", "estimateNextNumber", "estimatePadding", "salesOrderPrefix", "salesOrderSuffix", "salesOrderNextNumber", "salesOrderPadding", "deliveryChallanPrefix", "deliveryChallanSuffix", "deliveryChallanNextNumber", "deliveryChallanPadding", "salesReturnPrefix", "salesReturnSuffix", "salesReturnNextNumber", "salesReturnPadding", "defaultValidityDays", "defaultDeliveryDays", "defaultNotes", "defaultTerms", "defaultSalesOrderNotes", "defaultSalesOrderTerms", "defaultDeliveryInstructions", "defaultDeliveryTerms", "defaultReturnReason", "defaultReturnPolicy", "createdAt", "updatedAt")
        VALUES (${`sset_${crypto.randomUUID()}`}, ${organizationId}, ${def.estimatePrefix}, ${def.estimateSuffix ?? null}, ${def.estimateNextNumber}, ${def.estimatePadding}, ${def.salesOrderPrefix}, ${def.salesOrderSuffix ?? null}, ${def.salesOrderNextNumber}, ${def.salesOrderPadding}, ${def.deliveryChallanPrefix}, ${def.deliveryChallanSuffix ?? null}, ${def.deliveryChallanNextNumber}, ${def.deliveryChallanPadding}, ${def.salesReturnPrefix}, ${def.salesReturnSuffix ?? null}, ${def.salesReturnNextNumber}, ${def.salesReturnPadding}, ${def.defaultValidityDays}, ${def.defaultDeliveryDays}, ${def.defaultNotes}, ${def.defaultTerms}, ${def.defaultSalesOrderNotes}, ${def.defaultSalesOrderTerms}, ${def.defaultDeliveryInstructions}, ${def.defaultDeliveryTerms}, ${def.defaultReturnReason}, ${def.defaultReturnPolicy}, NOW(), NOW())
        ON CONFLICT ("organizationId") DO NOTHING
      `;

      // 2. Lock the sales_settings row exclusively with FOR UPDATE
      const lockedRows = await tx.$queryRaw<
        Array<{
          id: string;
          salesReturnPrefix: string;
          salesReturnSuffix: string | null;
          salesReturnNextNumber: number;
          salesReturnPadding: number;
        }>
      >`
        SELECT "id", "salesReturnPrefix", "salesReturnSuffix", "salesReturnNextNumber", "salesReturnPadding"
        FROM sales_settings
        WHERE "organizationId" = ${organizationId}
        FOR UPDATE
      `;

      const record = lockedRows[0];
      if (!record) {
        throw new Error(
          `Failed to locate and lock sales settings for ${organizationId}`,
        );
      }

      // 3. Collision-skip loop against existing sales returns
      let currentSeq = record.salesReturnNextNumber;
      let candidateNumber = formatSalesReturnNumber({
        prefix: record.salesReturnPrefix,
        suffix: record.salesReturnSuffix,
        padding: record.salesReturnPadding,
        nextNumber: currentSeq,
      });

      while (true) {
        const existing = await tx.salesReturn.findUnique({
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
        candidateNumber = formatSalesReturnNumber({
          prefix: record.salesReturnPrefix,
          suffix: record.salesReturnSuffix,
          padding: record.salesReturnPadding,
          nextNumber: currentSeq,
        });
      }

      // 4. Update next sequence
      const nextSequence = currentSeq + 1;
      await tx.salesSettings.update({
        where: { organizationId },
        data: {
          salesReturnNextNumber: nextSequence,
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

export const salesSettingsRepository = new PrismaSalesSettingsRepository();
