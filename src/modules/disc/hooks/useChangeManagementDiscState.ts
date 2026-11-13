import { useMutation } from '@tanstack/react-query';
import { changeManagementDiscState } from '../../../api/disc/reports';

export function useChangeManagementDiscState() {
  return useMutation({
    mutationFn: ({ id, action, value }: { id: string; action: 'approve' | 'release'; value: boolean }) =>
      changeManagementDiscState(id, action, value),
  });
}
