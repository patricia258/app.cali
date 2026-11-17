import { useMutation } from '@tanstack/react-query';
import { sendManagementDiscPdf } from '../../../api/disc/reports';
import { captureQueryScope } from '../../../api/query-client';
import { useRefreshManagementDisc } from './useRefreshManagementDisc';

type SendReport = { id: string; recipient: { name: string; email: string }; path: string; blob: Blob };

export function useSendManagementDiscPdf(linkId: string) {
  const captureRefresh = useRefreshManagementDisc(linkId);
  return useMutation<void, Error, SendReport, ReturnType<typeof captureRefresh>>({
    gcTime: 0,
    onMutate: captureRefresh,
    onSuccess: (_result, _variables, refresh) => refresh?.(),
    mutationFn: ({ id, recipient, path, blob }, { client }) =>
      sendManagementDiscPdf(id, recipient, path, blob, captureQueryScope(client)),
  });
}
