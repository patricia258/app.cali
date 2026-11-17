import { skipToken, useQuery } from '@tanstack/react-query';
import { reportsKeys } from '../../../api/reports/query-keys';
import { readReportPaperIdentity } from '../../../api/reports/paper';

export function useReportPaperIdentity(userId: string | undefined, protocol: string) {
  return useQuery({
    queryKey: reportsKeys.paperIdentity(userId, protocol),
    queryFn: userId && protocol && protocol !== '—'
      ? ({ signal }) => readReportPaperIdentity(protocol, signal)
      : skipToken,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}
