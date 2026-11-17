import { skipToken, useQuery } from '@tanstack/react-query';
import { reportsKeys } from '../../../../api/reports/query-keys';
import { readWithdrawableReports } from '../../../../api/reports/withdrawal';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useWithdrawableReports() {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: reportsKeys.withdrawable(user?.id),
    queryFn: user?.id ? ({ signal }) => readWithdrawableReports(signal) : skipToken,
    refetchOnWindowFocus: true,
  });
}
