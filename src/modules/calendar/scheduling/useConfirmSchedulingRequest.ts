import { useMutation } from '@tanstack/react-query';
import { runSchedulingCommand, syncScheduledEvent } from '../../../api/calendar/requests';
import { errorMessage } from '../../../lib/errorMessage';
import type { Notice } from './SchedulingNotice';
import type { SchedulingRequest } from './schedulingRequests';

export function useConfirmSchedulingRequest(onNotice: (notice: Notice) => void) {
  return useMutation({
    mutationFn: async ({ request, slotIndex }: { request: SchedulingRequest; slotIndex: number }) => {
      if (request.online_extra_requested && !request.online_extra_quote_accepted_at) {
        throw new Error('Envie o orçamento e aguarde o aceite antes de oferecer a confirmação.');
      }
      const slot = request.requested_slots?.[slotIndex];
      if (!slot) throw new Error('Horário indisponível.');
      if (request.extra_visit) {
        const result = await runSchedulingCommand('admin_confirm_extra_visit_v1', { p_request_id: request.id, p_slot_index: slotIndex });
        if (result?.event_id) {
          const sync = await syncScheduledEvent(result.event_id).catch(() => null);
          if (!sync || sync.error || sync.data?.error) {
            return { message: 'Visita confirmada no Workspace. A sincronização com o Google ficou pendente para nova tentativa.', tone: 'error' as const };
          }
        }
        return { message: 'Visita extra confirmada e cliente notificado.' };
      }
      await runSchedulingCommand('admin_respond_scheduling_request_v1', {
        p_request_id: request.id, p_proposed_slots: [slot], p_note: 'Um dos horários enviados está disponível.', p_decline: false,
      });
      return { message: 'Horário enviado ao cliente para confirmação.' };
    },
    onSuccess: (nextNotice) => {
      onNotice(nextNotice);
      window.dispatchEvent(new Event('cali-calendar-record-updated'));
    },
    onError: (failure) => onNotice({ message: errorMessage(failure, 'Não foi possível confirmar o horário.'), tone: 'error' }),
  });
}
