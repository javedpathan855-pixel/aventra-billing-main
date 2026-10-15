import "server-only";

import { resolveDebitNoteContext } from "../context/debit-note-context";
import { debitNoteRepository } from "../../infrastructure/repositories/prisma-debit-note-repository";
import type { DebitNote } from "../../domain/debit-note";

export const getDebitNoteById = async (
  id: string,
): Promise<DebitNote | null> => {
  const { organizationId } = await resolveDebitNoteContext();
  return await debitNoteRepository.findById(organizationId, id);
};
