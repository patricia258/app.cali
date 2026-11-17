import { useQuery } from '@tanstack/react-query';
import { hoursKeys } from '../../../api/hours/query-keys';
import { readHourEntryAudit } from '../../../api/hours/audit';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useHourEntryAudit() {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: hoursKeys.audit(user?.id),
    queryFn: ({ signal }) => readHourEntryAudit(signal),
    enabled: Boolean(user?.id),
    gcTime: 0,
  });
}
