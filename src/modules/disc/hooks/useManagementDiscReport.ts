import { useQuery } from '@tanstack/react-query';
import { readManagementDiscReport } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { GestaoData } from '../components/GestaoReport';

export function useManagementDiscReport(linkId: string, role: 'admin' | 'client') {
  const { user, active } = useWorkspaceAuth();
  return useQuery({
    queryKey: ['disc', 'management-report', user?.id, role, linkId],
    queryFn: async () => await readManagementDiscReport(linkId) as GestaoData | null,
    enabled: Boolean(user && active && linkId),
    gcTime: 0,
  });
}
