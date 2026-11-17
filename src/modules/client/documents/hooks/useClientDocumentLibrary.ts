import { skipToken, useQuery } from '@tanstack/react-query';
import { readClientDocumentLibrary } from '../../../../api/client/documents/library';
import { clientKeys } from '../../../../api/client/query-keys';

export function useClientDocumentLibrary(actorId: string | null) {
  return useQuery({
    queryKey: clientKeys.documents(actorId),
    queryFn: actorId ? ({ signal }) => readClientDocumentLibrary(signal) : skipToken,
  });
}
