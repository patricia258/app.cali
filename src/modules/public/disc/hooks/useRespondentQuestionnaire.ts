import { useQuery } from '@tanstack/react-query';
import { discKeys } from '../../../../api/disc/query-keys';
import { openRespondentQuestionnaire } from '../../../../api/disc/respondent';

export function useRespondentQuestionnaire(slug: string, inviteToken: string) {
  return useQuery({
    queryKey: discKeys.respondentQuestionnaire(slug, inviteToken),
    queryFn: ({ signal }) => openRespondentQuestionnaire(slug, inviteToken, signal),
    gcTime: 0,
    refetchOnReconnect: false,
  });
}
