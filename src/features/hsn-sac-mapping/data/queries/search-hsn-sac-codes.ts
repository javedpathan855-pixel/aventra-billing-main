import "server-only";

import { resolveHsnSacContext } from "../context/hsn-sac-context";
import { hsnSacRepository } from "../../infrastructure/repositories/prisma-hsn-sac-repository";
import { toHsnSacDto } from "../mappers/hsn-sac-mappers";
import type { HsnSacCodeDto, HsnSacFilterInput } from "../dto/hsn-sac-dto";

export type SearchHsnSacResult = {
  codes: HsnSacCodeDto[];
  totalCount: number;
};

export const searchHsnSacCodes = async (
  filter?: HsnSacFilterInput,
): Promise<SearchHsnSacResult> => {
  await resolveHsnSacContext();

  const page = filter?.page ?? 1;
  const pageSize = filter?.pageSize ?? 20;

  const result = await hsnSacRepository.list({
    type: filter?.type,
    query: filter?.query,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    codes: result.codes.map(toHsnSacDto),
    totalCount: result.totalCount,
  };
};
