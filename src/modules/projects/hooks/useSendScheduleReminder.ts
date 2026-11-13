import { useMutation } from '@tanstack/react-query';
import { readProjectActor } from '../../../api/projects/conversation';
import { sendScheduleReminder } from '../../../api/projects/schedule';
import type { WorkspaceProject } from '../../../domain/projects';

export function useSendScheduleReminder(project: WorkspaceProject, onSent: () => void) {
  return useMutation({
    mutationFn: async () => {
      const { data } = await readProjectActor();
      const actor = data.user?.id;
      if (!actor) throw new Error('Não foi possível identificar o usuário administrador.');
      const { error } = await sendScheduleReminder({ id: project.id, company_id: project.companyId, name: project.name }, actor);
      if (error) throw new Error(error.message);
    },
    onSuccess: onSent,
  });
}
