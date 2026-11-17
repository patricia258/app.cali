import { useMutation } from '@tanstack/react-query';
import { changeManagementDiscState } from '../../../api/disc/reports';
import { useRefreshManagementDisc } from './useRefreshManagementDisc';

export function useChangeManagementDiscState(linkId: string) {
  const captureRefresh = useRefreshManagementDisc(linkId);
  return useMutation({
    gcTime: 0,
    onMutate: captureRefresh,
    onSuccess: (result, _variables, refresh) => { if (!result.error) return refresh?.(); },
    mutationFn: ({ id, action, value }: { id: string; action: 'approve' | 'release'; value: boolean }) =>
      changeManagementDiscState(id, action, value),
  });
}
