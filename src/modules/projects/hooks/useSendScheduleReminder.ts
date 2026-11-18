import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureQueryScope } from '../../../api/query-client';
import { readProjectActor } from '../../../api/projects/conversation';
import { sendScheduleReminder } from '../../../api/projects/schedule';
import type { WorkspaceProject } from '../../../domain/projects';

export function useSendScheduleReminder(project: WorkspaceProject, onSent: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    onMutate: () => ({ isCurrent: captureQueryScope(queryClient), afterSave: onSent }),
    mutationFn: async () => {
      const isCurrent = captureQueryScope(queryClient);
      const { data } = await readProjectActor();
      const actor = data.user?.id;
      if (!isCurrent()) throw new Error('A sessão mudou. Tente novamente.');
      if (!actor) throw new Error('Não foi possível identificar o usuário administrador.');
      const { error } = await sendScheduleReminder({ id: project.id, company_id: project.companyId, name: project.name }, actor);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, _variables, scope) => {
      if (scope?.isCurrent()) scope.afterSave();
    },
  });
}
