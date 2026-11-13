import { skipToken, useQuery } from '@tanstack/react-query';
import { readReportPaperIdentity } from '../../../api/reports/paper';

export function useReportPaperIdentity(userId: string | undefined, protocol: string) {
  return useQuery({
    queryKey: ['reports', 'paper-identity', userId, protocol],
    queryFn: userId && protocol && protocol !== '—'
      ? ({ signal }) => readReportPaperIdentity(protocol, signal)
      : skipToken,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
}
