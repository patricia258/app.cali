import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMapaReport, type MapaDelivery } from '../../../../api/admin/people-map/delivery';
import { peopleMapKeys } from '../../../../api/admin/people-map/query-keys';
import { captureQueryScope } from '../../../../api/query-client';
import { useWorkspaceAuth } from '../../../../auth/hooks/useWorkspaceAuth';

type MapaReportSubmission = Omit<MapaDelivery, 'pdfBase64'> & {
  attachment: File | null;
  isCurrent: () => boolean;
};
type MapaReportVariables = Omit<MapaReportSubmission, keyof MapaDelivery> & {
  actorId: string | undefined;
  delivery: Omit<MapaDelivery, 'pdfBase64'>;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function useSendMapaReport() {
  const queryClient = useQueryClient();
  const { user } = useWorkspaceAuth();
  const actorId = user?.id;
  const { isPending, mutateAsync, reset } = useMutation({
    mutationKey: peopleMapKeys.sendReport(actorId),
    gcTime: 0,
    mutationFn: async ({ attachment, isCurrent, actorId, delivery }: MapaReportVariables) => {
      if (!actorId || !isCurrent()) throw new Error('A sessão mudou. Tente novamente.');
      const pdfBase64 = attachment ? await fileToBase64(attachment) : undefined;
      if (!isCurrent()) throw new Error('A sessão mudou. Tente novamente.');
      return sendMapaReport({ ...delivery, pdfBase64 });
    },
    onSuccess: (_receipt, { actorId, delivery, isCurrent }) => {
      if (!isCurrent()) return;
      void queryClient.invalidateQueries({ queryKey: peopleMapKeys.delivery(actorId, delivery.responseId), exact: true });
    },
  });

  return {
    isPending,
    captureScope: () => captureQueryScope(queryClient),
    reset,
    send: ({ attachment, isCurrent, ...delivery }: MapaReportSubmission) => mutateAsync({ actorId, attachment, isCurrent, delivery }),
  };
}
