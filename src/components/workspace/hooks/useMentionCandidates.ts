import { useQuery } from '@tanstack/react-query';
import { workspaceKeys } from '../../../api/workspace/query-keys';
import { listMentionCandidates } from '../../../api/workspace/mentions';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';

export function useMentionCandidates(enabled: boolean) {
  const { user } = useWorkspaceAuth();
  return useQuery({
    queryKey: workspaceKeys.mentionCandidates(user?.id),
    queryFn: async ({ signal }) => {
      const people = await listMentionCandidates(signal);
      if (!people) throw new Error('Não foi possível carregar as sugestões de menção.');
      return people;
    },
    enabled: enabled && Boolean(user?.id),
    staleTime: 60_000,
  });
}
