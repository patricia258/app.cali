import { skipToken, useQuery } from '@tanstack/react-query';
import { reportsKeys } from '../../../api/reports/query-keys';
import { readReportVisitCosts } from '../../../api/reports/paper';

export function useReportVisitCosts(userId: string | undefined, protocol: string, identity?: Parameters<typeof readReportVisitCosts>[0] | null) {
  return useQuery({
    queryKey: reportsKeys.paperVisits(userId, protocol, identity?.companyId, identity?.start, identity?.end, identity?.approvedAt),
    queryFn: userId && identity ? ({ signal }) => readReportVisitCosts(identity, signal) : skipToken,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}
