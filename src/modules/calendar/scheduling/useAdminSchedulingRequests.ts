import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured } from '../../../api/access/session';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { loadAdminRequests } from './schedulingRequests';
import { useSchedulingRequestsRefresh } from './useSchedulingRequestsRefresh';

export function useAdminSchedulingRequests() {
  const { user, role } = useWorkspaceAuth();
  const enabled = isSupabaseConfigured && role === 'admin' && Boolean(user?.id);
  const { data, error, refetch } = useQuery({
    queryKey: ['scheduling-requests', 'admin', user?.id],
    queryFn: loadAdminRequests,
    enabled,
  });
  const refresh = useCallback(() => { void refetch(); }, [refetch]);
  useSchedulingRequestsRefresh(enabled, refresh);
  return { data, error, enabled };
}
