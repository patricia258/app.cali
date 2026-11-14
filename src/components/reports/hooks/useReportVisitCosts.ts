import { skipToken, useQuery } from '@tanstack/react-query';
import { readReportVisitCosts } from '../../../api/reports/paper';

export function useReportVisitCosts(userId: string | undefined, protocol: string, identity?: Parameters<typeof readReportVisitCosts>[0] | null) {
  return useQuery({
    queryKey: ['reports', 'paper-visits', userId, protocol, identity?.approvedAt],
    queryFn: identity ? ({ signal }) => readReportVisitCosts(identity, signal) : skipToken,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
}
