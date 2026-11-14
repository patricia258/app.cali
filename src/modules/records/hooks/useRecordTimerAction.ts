import { useMutation } from '@tanstack/react-query';
import { pauseRecordTimer, startRecordTimer } from '../../../api/records/operations';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export function useRecordTimerAction(recordId: string) {
  return useMutation({
    mutationFn: async (timerId: string | null) => {
      const { error } = timerId ? await pauseRecordTimer(timerId) : await startRecordTimer(recordId);
      if (error) throw new Error(error.message || 'Não foi possível atualizar o acompanhamento.');
    },
    onSuccess: () => window.dispatchEvent(new CustomEvent(TIMER_EVENT)),
  });
}
