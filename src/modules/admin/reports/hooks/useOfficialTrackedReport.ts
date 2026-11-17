import { skipToken, useQuery } from '@tanstack/react-query';
import { reportsKeys } from '../../../../api/reports/query-keys';
import { readOfficialTrackedReport } from '../../../../api/reports/tracking';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useOfficialTrackedReport(protocol?: string) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: reportsKeys.tracked(user?.id, protocol),
    queryFn: user?.id && protocol && protocol !== '—' ? ({ signal }) => readOfficialTrackedReport(protocol, signal) : skipToken,
    refetchInterval: 5000,
  });
}
