import { skipToken, useQuery } from '@tanstack/react-query';
import { readDocumentComments } from '../../../../api/client/documents/library';
import { clientKeys } from '../../../../api/client/query-keys';

export function useClientDocumentComments(actorId: string | null, documentId: string | null) {
  return useQuery({
    queryKey: clientKeys.documentComments(actorId, documentId),
    queryFn: actorId && documentId ? ({ signal }) => readDocumentComments(documentId, signal) : skipToken,
    gcTime: 0,
  });
}
