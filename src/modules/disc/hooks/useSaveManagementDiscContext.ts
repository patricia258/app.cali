import { useMutation } from '@tanstack/react-query';
import { saveManagementDiscContext } from '../../../api/disc/reports';
import { useRefreshManagementDisc } from './useRefreshManagementDisc';

export function useSaveManagementDiscContext(linkId: string) {
  const captureRefresh = useRefreshManagementDisc(linkId);
  return useMutation({
    gcTime: 0,
    onMutate: captureRefresh,
    onSuccess: (result, _variables, refresh) => { if (!result.error) return refresh?.(); },
    mutationFn: ({ id, fields }: { id: string; fields: Parameters<typeof saveManagementDiscContext>[1] }) =>
      saveManagementDiscContext(id, fields),
  });
}
