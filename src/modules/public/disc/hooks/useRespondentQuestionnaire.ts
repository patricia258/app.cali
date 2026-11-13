import { useQuery } from '@tanstack/react-query';
import { openRespondentQuestionnaire } from '../../../../api/disc/respondent';

export function useRespondentQuestionnaire(slug: string, inviteToken: string) {
  return useQuery({
    queryKey: ['public', 'disc-questionnaire', slug, inviteToken],
    queryFn: () => openRespondentQuestionnaire(slug, inviteToken),
    gcTime: 0,
    refetchOnReconnect: false,
  });
}
