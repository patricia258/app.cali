import { useMutation } from '@tanstack/react-query';
import { sendManagementDiscPdf } from '../../../api/disc/reports';

export function useSendManagementDiscPdf() {
  return useMutation({
    mutationFn: ({ id, recipient, path, blob }: { id: string; recipient: { name: string; email: string }; path: string; blob: Blob }) =>
      sendManagementDiscPdf(id, recipient, path, blob),
  });
}
