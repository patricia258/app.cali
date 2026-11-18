import { skipToken, useQuery } from '@tanstack/react-query';
import { readAuditTimeline } from '../../../../api/admin/audit/timeline';
import { adminKeys } from '../../../../api/admin/query-keys';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useAdminAuditTimeline() {
  const { user, role } = useWorkspaceAuth();
  const actorId = user?.id ?? null;

  return useQuery({
    queryKey: adminKeys.audit(actorId),
    queryFn: actorId && role === 'admin' ? ({ signal }) => readAuditTimeline(signal) : skipToken,
    gcTime: 0,
  });
}
