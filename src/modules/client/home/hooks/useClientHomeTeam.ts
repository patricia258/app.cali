import { clientKeys } from '../../../../api/client/query-keys';
import { skipToken, useQuery } from '@tanstack/react-query';
import { readClientHomeTeam } from '../../../../api/client/home/team';

export function useClientHomeTeam(userId?: string, companyId?: string) {
  return useQuery({
    queryKey: clientKeys.homeTeam(userId ?? null, companyId || null),
    queryFn: userId && companyId ? ({ signal }) => readClientHomeTeam(companyId, signal) : skipToken,
  });
}
