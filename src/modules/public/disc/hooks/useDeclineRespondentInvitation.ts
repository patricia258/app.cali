import { useMutation } from '@tanstack/react-query';
import { declineRespondentInvitation } from '../../../../api/disc/respondent';
import { useParams } from '../../../../hooks/useParams';

export function useDeclineRespondentInvitation() {
  const { token = '' } = useParams();
  const mutation = useMutation({ gcTime: 0, mutationFn: declineRespondentInvitation });
  const state = mutation.isPending ? 'busy' : mutation.isSuccess && mutation.data ? 'done' : mutation.isIdle ? 'ask' : 'failed';
  return { state, decline: () => mutation.mutate(token) };
}
