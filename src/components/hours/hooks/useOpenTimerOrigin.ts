import { useNavigate } from '../../../hooks/useNavigate';

type TimerOrigin = {
  accountRecordId?: string | null;
  projectId?: string | null;
  deliverableId?: string | null;
  taskId?: string | null;
};

export function useOpenTimerOrigin() {
  const navigate = useNavigate();

  return ({ accountRecordId, projectId, deliverableId, taskId }: TimerOrigin) => {
    if (accountRecordId) {
      navigate(`/admin/registros?${new URLSearchParams({ record: accountRecordId })}`);
      return;
    }

    const params = new URLSearchParams();
    if (projectId) params.set('project', projectId);
    if (deliverableId) params.set('deliverable', deliverableId);
    if (taskId) params.set('task', taskId);
    else if (deliverableId) params.set('view', 'overview');
    navigate(params.size ? `/admin/projetos?${params}` : '/admin/projetos');
  };
}
