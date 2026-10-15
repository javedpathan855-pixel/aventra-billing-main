import "server-only";

import { resolveUnitContext } from "../context/unit-context";
import { unitRepository } from "../../infrastructure/repositories/prisma-unit-repository";
import { countQuantityDecimals, MAX_UNIT_PRECISION } from "../../domain/rules/unit-rules";
import { UnitDomainError } from "../../domain/errors/unit-errors";

export type LineUnitInput = {
  unit?: string | null;
  quantity: number;
};

/**
 * Validates line-item units against the organization master. Lines without a
 * unit are skipped (legacy rows predate the snapshot column). When the
 * organization has not adopted the master, any unit within the storage scale
 * is accepted; otherwise the unit must be an active master record and the
 * quantity must respect its precision.
 */
export const assertLineUnitsValid = async (
  organizationId: string,
  lines: LineUnitInput[],
): Promise<void> => {
  const relevant = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.unit !== undefined && line.unit !== null && line.unit !== "");

  for (const { line } of relevant) {
    if (countQuantityDecimals(line.quantity) > MAX_UNIT_PRECISION) {
      throw new UnitDomainError("Quantity cannot exceed 3 decimal places.");
    }
  }
  if (relevant.length === 0) return;

  const { totalCount } = await unitRepository.list(organizationId, { limit: 1, offset: 0 });
  if (totalCount === 0) return;

  for (const { line, index } of relevant) {
    if (!line.unit) continue;
    const record = await unitRepository.findByCode(organizationId, line.unit);
    if (!record) {
      throw new UnitDomainError(`Line ${index + 1}: unit "${line.unit}" is not a defined unit.`);
    }
    if (record.status !== "ACTIVE") {
      throw new UnitDomainError(`Line ${index + 1}: unit "${line.unit}" is inactive.`);
    }
    if (countQuantityDecimals(line.quantity) > record.precision) {
      throw new UnitDomainError(
        `Line ${index + 1}: quantity exceeds the ${record.precision} decimal place(s) allowed for unit "${line.unit}".`,
      );
    }
  }
};

export const assertCallerLineUnitsValid = async (lines: LineUnitInput[]): Promise<void> => {
  const { organizationId } = await resolveUnitContext();
  await assertLineUnitsValid(organizationId, lines);
};
