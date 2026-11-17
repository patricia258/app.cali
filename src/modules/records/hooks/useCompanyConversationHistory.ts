import { useInfiniteQuery } from '@tanstack/react-query';
import { readCompanyConversationHistory, type HistoryEvent } from '../../../api/records/history';
import { recordKeys } from '../../../api/records/query-keys';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export const historyPageSize = 25;

export function useCompanyConversationHistory(companyId: string, role: 'admin' | 'client', staff: boolean, filter: string) {
  const { user } = useWorkspaceAuth();
  return useInfiniteQuery({
    queryKey: recordKeys.companyHistory(user?.id, companyId, role, staff, filter),
    enabled: Boolean(user?.id && companyId),
    initialPageParam: null as HistoryEvent | null,
    queryFn: ({ pageParam, signal }) => readCompanyConversationHistory(companyId, filter, pageParam, signal),
    getNextPageParam: (page) => page.length > historyPageSize ? page[historyPageSize - 1] : undefined,
    gcTime: 0,
  });
}
