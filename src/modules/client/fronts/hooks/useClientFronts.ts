import { clientKeys } from '../../../../api/client/query-keys';
import { skipToken, useQuery } from '@tanstack/react-query';
import { readClientFronts } from '../../../../api/fronts/contracts';

export function useClientFronts(userId: string | undefined) {
  return useQuery({
    queryKey: clientKeys.fronts(userId ?? null),
    queryFn: userId ? ({ signal }) => readClientFronts(userId, signal) : skipToken,
  });
}
