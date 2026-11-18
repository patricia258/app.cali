import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { acknowledgeDocumentVersion, type readClientDocumentLibrary } from '../../../../api/client/documents/library';
import { clientKeys } from '../../../../api/client/query-keys';

type DocumentLibrary = Awaited<ReturnType<typeof readClientDocumentLibrary>>;

export function useAcknowledgeClientDocument(actorId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = clientKeys.documents(actorId);

  return useMutation({
    mutationFn: acknowledgeDocumentVersion,
    onMutate: () => captureQueryScope(queryClient),
    onSuccess: async (acknowledged, file, isCurrent) => {
      if (!actorId || !acknowledged || !isCurrent?.()) return;
      await queryClient.cancelQueries({ queryKey, exact: true });
      if (!isCurrent()) return;
      queryClient.setQueryData<DocumentLibrary>(queryKey, (library) => {
        if (!library || library.acknowledged.includes(file.id)) return library;
        return { ...library, acknowledged: [...library.acknowledged, file.id] };
      });
    },
    gcTime: 0,
  });
}
