import { skipToken, useQuery } from '@tanstack/react-query';
import { reportsKeys } from '../../../../api/reports/query-keys';
import { readClientReportHistory } from '../../../../api/reports/tracking';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useClientReportHistory(companyId: string) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: reportsKeys.clientHistory(user?.id, companyId),
    queryFn: user?.id && companyId ? ({ signal }) => readClientReportHistory(companyId, signal) : skipToken,
  });
}
