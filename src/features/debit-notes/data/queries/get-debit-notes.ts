import "server-only";

import { resolveDebitNoteContext } from "../context/debit-note-context";
import { debitNoteRepository } from "../../infrastructure/repositories/prisma-debit-note-repository";
import type { DebitNote } from "../../domain/debit-note";
import type { DebitNoteFilterCriteria } from "../../domain/repositories/debit-note-repository";

export const getDebitNotes = async (
  criteria?: DebitNoteFilterCriteria,
): Promise<{ debitNotes: DebitNote[] }> => {
  const { organizationId } = await resolveDebitNoteContext();
  const debitNotes = await debitNoteRepository.findMany(organizationId, criteria);
  return { debitNotes };
};
