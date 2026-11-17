import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifyCalendarRecordUpdated, refreshSchedulingCache } from '../../../api/calendar/query-cache';
import { runSchedulingCommand, syncScheduledEvent } from '../../../api/calendar/requests';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { errorMessage } from '../../../lib/errorMessage';
import type { Notice } from './SchedulingNotice';
import type { SchedulingRequest } from './schedulingRequests';

type AcceptProposal = {
  request: SchedulingRequest;
  index: number;
  needsAck: boolean;
  acknowledged: boolean;
};

export function useAcceptSchedulingProposal(onNotice: (notice: Notice) => void) {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async ({ request, index, needsAck, acknowledged }: AcceptProposal) => {
      if (needsAck && !acknowledged) throw new Error('Registre sua ciência sobre a condição adicional antes de confirmar.');
      const isCurrent = captureQueryScope(client);
      const result = request.extra_visit
        ? await runSchedulingCommand('client_accept_extra_visit_proposal_v1', { p_request_id: request.id, p_slot_index: index })
        : await runSchedulingCommand('client_accept_scheduling_proposal_v2', {
          p_request_id: request.id, p_slot_index: index, p_billing_acknowledged: acknowledged,
        });
      if (!result?.event_id || !isCurrent()) return { message: 'Horário confirmado no Workspace.' };
      const sync = await syncScheduledEvent(result.event_id).catch(() => null);
      return !sync || sync.error || sync.data?.error
        ? { message: 'Horário confirmado no Workspace. A sincronização com o Google ficou pendente para nova tentativa.', tone: 'error' as const }
        : { message: 'Horário confirmado. O compromisso entrou no Workspace e no Google Calendar.' };
    },
    onSuccess: async (nextNotice, _variables, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await refreshSchedulingCache(client, scope.actorId, 'client');
      if (!scope.isCurrent()) return;
      onNotice(nextNotice);
      notifyCalendarRecordUpdated();
    },
    onError: (failure, _variables, scope) => {
      if (scope?.isCurrent()) onNotice({ message: errorMessage(failure, 'Não foi possível confirmar o horário.'), tone: 'error' });
    },
  });
}
