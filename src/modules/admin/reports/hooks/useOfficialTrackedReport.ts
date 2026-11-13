import { skipToken, useQuery } from '@tanstack/react-query';
import { readOfficialTrackedReport } from '../../../../api/reports/tracking';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useOfficialTrackedReport(protocol?: string) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['admin', 'report-tracking', user?.id, protocol],
    queryFn: user?.id && protocol && protocol !== '—' ? () => readOfficialTrackedReport(protocol) : skipToken,
    refetchInterval: 5000,
  });
}
