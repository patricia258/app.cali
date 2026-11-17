import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { pauseRecordTimer, startRecordTimer } from '../../../api/records/operations';
import { TIMER_EVENT } from '../../../lib/timerSemantics';

export function useRecordTimerAction(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => captureQueryScope(queryClient),
    mutationFn: async (timerId: string | null) => {
      const { error } = timerId ? await pauseRecordTimer(timerId) : await startRecordTimer(recordId);
      if (error) throw new Error(error.message || 'Não foi possível atualizar o acompanhamento.');
    },
    onSuccess: (_data, _variables, isCurrent) => {
      if (isCurrent?.()) window.dispatchEvent(new CustomEvent(TIMER_EVENT));
    },
  });
}
