import { useQuery } from '@tanstack/react-query';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { isSupabaseConfigured } from '../../../api/access/session';
import { readDeliverableDependencies } from '../../../api/projects/dependencies';

export type DependencyMode = 'admin' | 'staff' | 'client';

export function useDeliverableDependencies(deliverableId: string, companyId: string, mode: DependencyMode) {
  const { user } = useWorkspaceAuth();

  return useQuery({
    queryKey: ['deliverable-dependencies', user?.id, mode, companyId, deliverableId],
    queryFn: ({ signal }) => readDeliverableDependencies(deliverableId, signal),
    enabled: isSupabaseConfigured,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
