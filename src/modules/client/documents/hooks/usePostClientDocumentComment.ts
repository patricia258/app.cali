import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../../api/query-client';
import { postDocumentComment } from '../../../../api/client/documents/library';
import { clientKeys } from '../../../../api/client/query-keys';

export function usePostClientDocumentComment(actorId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, message }: { file: Parameters<typeof postDocumentComment>[0]; message: string }) =>
      postDocumentComment(file, message),
    onMutate: () => captureQueryScope(queryClient),
    onSuccess: (posted, { file }, isCurrent) => {
      if (actorId && posted && isCurrent?.()) {
        return queryClient.invalidateQueries({ queryKey: clientKeys.documentComments(actorId, file.id), exact: true });
      }
    },
    gcTime: 0,
  });
}
