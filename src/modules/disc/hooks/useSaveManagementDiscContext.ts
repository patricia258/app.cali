import { useMutation } from '@tanstack/react-query';
import { saveManagementDiscContext } from '../../../api/disc/reports';

export function useSaveManagementDiscContext() {
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Parameters<typeof saveManagementDiscContext>[1] }) =>
      saveManagementDiscContext(id, fields),
  });
}
