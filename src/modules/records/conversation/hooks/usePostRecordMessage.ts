import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { recordKeys } from '../../../../api/records/query-keys';
import { z } from 'zod';
import { postRecordMessage } from '../../../../api/records/conversation';

const receipt = z.object({ workflow_status: z.enum(['open', 'in_progress', 'waiting_client', 'standby', 'completed', 'cancelled']).optional() });
export type RecordMessageReceipt = z.infer<typeof receipt> | undefined;

export function usePostRecordMessage(actorId: string | undefined, recordId: string, partner: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({
      isCurrent: captureQueryScope(queryClient),
      queryKey: recordKeys.messages(actorId, recordId),
    }),
    gcTime: 0,
    mutationFn: async ({ body, internal }: { body: string; internal: boolean }) => {
      const { data, error } = await postRecordMessage(recordId, body, partner, internal);
      if (error) throw new Error(error.message);
      return receipt.safeParse(data).data;
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) return queryClient.invalidateQueries({ queryKey: scope.queryKey, exact: true });
    },
  });
}
