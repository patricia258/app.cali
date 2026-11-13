import { useQuery } from '@tanstack/react-query';
import { readHourEntryAudit } from '../../../api/hours/audit';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useHourEntryAudit() {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['hours', 'audit', user?.id],
    queryFn: ({ signal }) => readHourEntryAudit(signal),
    enabled: Boolean(user?.id),
    gcTime: 0,
  });
}
