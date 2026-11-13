import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { postRecordMessage } from '../../../../api/records/conversation';

const receipt = z.object({ workflow_status: z.enum(['open', 'in_progress', 'waiting_client', 'standby', 'completed', 'cancelled']).optional() });
export type RecordMessageReceipt = z.infer<typeof receipt> | undefined;

export function usePostRecordMessage(recordId: string, partner: boolean) {
  return useMutation({
    gcTime: 0,
    mutationFn: async ({ body, internal }: { body: string; internal: boolean }) => {
      const { data, error } = await postRecordMessage(recordId, body, partner, internal);
      if (error) throw new Error(error.message);
      return receipt.safeParse(data).data;
    },
  });
}
