import { skipToken, useQuery } from '@tanstack/react-query';
import { readWithdrawableReports } from '../../../../api/reports/withdrawal';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useWithdrawableReports() {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['admin', 'withdrawable-reports', user?.id],
    queryFn: user?.id ? readWithdrawableReports : skipToken,
    refetchOnWindowFocus: true,
  });
}
