import { skipToken, useQuery } from '@tanstack/react-query';
import { readClientHomeTeam } from '../../../../api/client/home/team';

export function useClientHomeTeam(userId?: string, companyId?: string) {
  return useQuery({
    queryKey: ['client', 'home-team', userId, companyId],
    queryFn: userId && companyId ? ({ signal }) => readClientHomeTeam(companyId, signal) : skipToken,
  });
}
