import { useQuery } from '@tanstack/react-query';
import { discKeys } from '../../../api/disc/query-keys';
import { readManagementDiscReport } from '../../../api/disc/reports';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { GestaoData } from '../components/GestaoReport';

export function useManagementDiscReport(linkId: string, role: 'admin' | 'client') {
  const { user, active } = useWorkspaceAuth();
  return useQuery({
    queryKey: discKeys.managementReport(user?.id, role, linkId),
    queryFn: async ({ signal }) => await readManagementDiscReport(linkId, signal) as GestaoData | null,
    enabled: Boolean(user && active && linkId),
    gcTime: 0,
  });
}
