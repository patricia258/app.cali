import { projectKeys } from '../../../api/projects/query-keys';
import { useQuery } from '@tanstack/react-query';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readDeliverableDependencies } from '../../../api/projects/dependencies';

export type DependencyMode = 'admin' | 'staff' | 'client';

export function useDeliverableDependencies(deliverableId: string, companyId: string, mode: DependencyMode) {
  const { user } = useWorkspaceAuth();

  return useQuery({
    queryKey: projectKeys.dependencies(user?.id, companyId, deliverableId, mode),
    queryFn: ({ signal }) => readDeliverableDependencies(deliverableId, signal),
    enabled: Boolean(isSupabaseConfigured && user?.id && companyId && deliverableId),
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
