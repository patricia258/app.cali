import { skipToken, useQuery } from '@tanstack/react-query';
import { readClientReportHistory } from '../../../../api/reports/tracking';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useClientReportHistory(companyId: string) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['admin', 'report-client-history', user?.id, companyId],
    queryFn: user?.id ? () => readClientReportHistory(companyId) : skipToken,
  });
}
