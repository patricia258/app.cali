import { useQuery } from '@tanstack/react-query';
import { countAdminProjects } from '../../../../api/projects/workspace';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

export function useAdminProjectCount() {
  const { user } = useWorkspaceAuth();

  return useQuery({
    queryKey: ['admin-projects-count', user?.id],
    queryFn: ({ signal }) => countAdminProjects(signal),
    gcTime: 0,
  });
}
