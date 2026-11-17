import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifyCalendarRecordUpdated, refreshSchedulingCache } from '../../../api/calendar/query-cache';
import { runSchedulingCommand } from '../../../api/calendar/requests';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { ClientSchedulingSelection } from './ClientSchedulingDialog';
import { readSlots } from './schedulingRequests';

export function useSaveClientSchedulingRequest(selection: ClientSchedulingSelection, onSaved: (message: string) => void) {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async (form: FormData) => {
      const { request, kind } = selection;
      const note = String(form.get('note') ?? '');
      if (kind === 'quote') {
        await runSchedulingCommand('client_accept_online_extra_quote_v1', { p_request_id: request.id });
        return 'Orçamento aceito. A CALI poderá confirmar o horário.';
      }
      if (kind === 'extra-options') {
        const slots = readSlots(form, 240);
        if (slots.length !== 2) throw new Error('Informe duas opções completas.');
        await runSchedulingCommand('client_counter_extra_visit_v1', { p_request_id: request.id, p_slots: slots, p_note: note });
        return 'Novas opções enviadas. Vai dar certo 🙂';
      }
      await runSchedulingCommand('client_request_new_scheduling_options_v1', { p_request_id: request.id, p_note: note });
      return 'Pedido enviado. Vamos encontrar uma data juntos.';
    },
    onSuccess: async (message, _form, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await refreshSchedulingCache(client, scope.actorId, 'client');
      if (!scope.isCurrent()) return;
      onSaved(message);
      notifyCalendarRecordUpdated();
    },
  });
}
