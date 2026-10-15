import "server-only";

import { resolveHsnSacContext } from "../context/hsn-sac-context";
import { hsnSacRepository } from "../../infrastructure/repositories/prisma-hsn-sac-repository";
import type { HsnSacImportStatus } from "../../domain/repositories/hsn-sac-repository";

export const getHsnSacImportStatus = async (): Promise<HsnSacImportStatus> => {
  await resolveHsnSacContext();
  return hsnSacRepository.getImportStatus();
};
