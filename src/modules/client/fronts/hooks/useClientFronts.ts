import { skipToken, useQuery } from '@tanstack/react-query';
import { clientFrontsKey, readClientFronts } from '../../../../api/fronts/contracts';

export function useClientFronts(userId: string | undefined) {
  return useQuery({
    queryKey: clientFrontsKey(userId ?? ''),
    queryFn: userId ? ({ signal }) => readClientFronts(userId, signal) : skipToken,
  });
}
