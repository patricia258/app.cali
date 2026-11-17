import { skipToken, useQuery } from '@tanstack/react-query';
import { adminKeys } from '../../../../api/admin/query-keys';
import { countAdminProjects } from '../../../../api/projects/workspace';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useAdminProjectCount() {
  const { user, role } = useWorkspaceAuth();
  const actorId = user?.id ?? null;

  return useQuery({
    queryKey: adminKeys.projectCount(actorId),
    queryFn: actorId && role === 'admin' ? ({ signal }) => countAdminProjects(signal) : skipToken,
    gcTime: 0,
  });
}
