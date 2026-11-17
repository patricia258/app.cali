import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notifyCalendarRecordUpdated, refreshSchedulingCache } from '../../../api/calendar/query-cache';
import { runSchedulingCommand } from '../../../api/calendar/requests';
import { captureQueryScope } from '../../../api/query-client';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import type { AdminSchedulingSelection } from './AdminSchedulingDialog';
import { readSlots } from './schedulingRequests';

export function useSaveAdminSchedulingRequest(selection: AdminSchedulingSelection, onSaved: (message: string) => void) {
  const { user } = useWorkspaceAuth();
  const client = useQueryClient();
  return useMutation({
    onMutate: () => ({ actorId: user?.id, isCurrent: captureQueryScope(client) }),
    mutationFn: async (form: FormData) => {
      const { kind, request } = selection;
      const note = String(form.get('note') ?? '');
      if (kind === 'quote') {
        await runSchedulingCommand('admin_quote_online_extra_v1', {
          p_request_id: request.id,
          p_amount_cents: Math.round(Number(form.get('amount')) * 100),
          p_note: note,
        });
        return 'Orçamento enviado para aceite do cliente.';
      }
      if (kind === 'fee') {
        await runSchedulingCommand('admin_decide_extra_visit_change_v2', {
          p_request_id: request.id, p_charge: form.get('charge') === 'true', p_note: note,
        });
        return 'Decisão registrada e cliente notificado.';
      }
      const decline = kind === 'decline';
      const minutes = Number(form.get('duration'));
      const slots = decline ? [] : readSlots(form, minutes);
      if (!decline && request.extra_visit && (minutes !== 240 || slots.length !== 2)) {
        throw new Error('Envie duas opções de 4 horas para a visita extra.');
      }
      if (!decline && slots.length === 0) throw new Error('Informe ao menos um horário.');
      await runSchedulingCommand('admin_respond_scheduling_request_v1', {
        p_request_id: request.id, p_proposed_slots: slots, p_note: note, p_decline: decline,
      });
      return decline ? 'Resposta registrada.' : 'Novos horários enviados ao cliente.';
    },
    onSuccess: async (message, _form, scope) => {
      if (!scope?.actorId || !scope.isCurrent()) return;
      await refreshSchedulingCache(client, scope.actorId, 'admin');
      if (!scope.isCurrent()) return;
      onSaved(message);
      notifyCalendarRecordUpdated();
    },
  });
}
