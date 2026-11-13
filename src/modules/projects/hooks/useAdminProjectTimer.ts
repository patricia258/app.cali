import { useEffect, useState } from 'react';
import type { readProjectTimerContext } from '../../../api/hours/timer-context';
import { useWorkspaceAuth } from '../../../auth/hooks/useWorkspaceAuth';
import { useFinalizeGlobalTimer } from '../../../components/hours/hooks/useFinalizeGlobalTimer';
import { usePauseGlobalTimer } from '../../../components/hours/hooks/usePauseGlobalTimer';
import type { TimerFinalizationTarget } from '../../../components/hours/TimerFinalizationDialog';
import { errorMessage } from '../../../lib/errorMessage';
import { useProjectTimerContext } from './useProjectTimerContext';
import { useStartProjectTimer } from './useStartProjectTimer';

type ProjectTimer = NonNullable<Awaited<ReturnType<typeof readProjectTimerContext>>['companyTimer']>;
type WorkTarget = { id: string; title: string; clientVisible: boolean; status: string };
type TimerScope = { companyId: string; projectId: string; deliverable: WorkTarget };
type Pending = { deliverableId: string; timer: ProjectTimer; target: TimerFinalizationTarget };

export function useAdminProjectTimer(scope: TimerScope | undefined, onChanged: () => Promise<void>) {
  const { user } = useWorkspaceAuth();
  const context = useProjectTimerContext(user?.id, scope?.companyId, scope?.deliverable.id);
  const startTimer = useStartProjectTimer();
  const pauseTimer = usePauseGlobalTimer();
  const [notice, setNotice] = useState<{ id: string; message: string; error?: boolean }>();
  const [confirmation, setConfirmation] = useState<Pending>();
  const [step, setStep] = useState<1 | 2>(1);
  const [finalizationError, setFinalizationError] = useState('');
  const finalize = useFinalizeGlobalTimer(() => {
    setConfirmation(undefined);
    setStep(1);
  });
  const deliverableId = scope?.deliverable.id;
  const pending = confirmation?.deliverableId === deliverableId ? confirmation : undefined;
  const companyTimer = context.data?.companyTimer;
  const timer = companyTimer && companyTimer.deliverableId === deliverableId ? companyTimer : undefined;
  const serverDeliverable = context.data?.deliverable;
  const workLocked = Boolean(serverDeliverable?.work_closed_at || [serverDeliverable?.status, scope?.deliverable.status]
    .some((status) => status === 'approved' || status === 'cancelled'));
  const busy = startTimer.isPending || pauseTimer.isPending || finalize.isPending || context.isFetching;

  useEffect(() => {
    setNotice(undefined);
    setConfirmation(undefined);
  }, [deliverableId]);

  function taskLocked(task: WorkTarget) {
    const current = context.data?.tasks.find(({ id }) => id === task.id);
    return Boolean(current?.work_closed_at || [task.status, current?.status]
      .some((status) => status === 'done' || status === 'approved' || status === 'cancelled'));
  }

  function show(message: string, error = false) {
    if (deliverableId) setNotice({ id: deliverableId, message, error });
  }

  async function start(task?: WorkTarget) {
    if (!scope || !serverDeliverable || context.error || busy || companyTimer || workLocked || (task && taskLocked(task))) return;
    setNotice(undefined);
    try {
      await startTimer.mutateAsync({
        p_company_id: scope.companyId,
        p_project_id: scope.projectId,
        p_deliverable_id: scope.deliverable.id,
        p_task_id: task?.id ?? null,
        p_category: 'Entregáveis',
        p_description: task?.title ?? scope.deliverable.title,
        p_client_visible: task?.clientVisible ?? scope.deliverable.clientVisible,
      });
      await onChanged();
    } catch (error) {
      show(errorMessage(error, 'Não foi possível iniciar o timer.'), true);
    }
  }

  async function pause(active: ProjectTimer) {
    if (busy) return;
    setNotice(undefined);
    try {
      await pauseTimer.mutateAsync(active.id);
      show('Sessão pausada e registrada no histórico de Horas. Você pode iniciar uma nova sessão depois.');
      await onChanged();
    } catch (error) {
      show(errorMessage(error, 'Não foi possível pausar a sessão.'), true);
    }
  }

  function requestStop(active: ProjectTimer, task?: WorkTarget) {
    if (!scope || busy) return;
    const taskTitle = task?.title ?? context.data?.tasks.find(({ id }) => id === active.taskId)?.title;
    setFinalizationError('');
    setStep(1);
    setConfirmation({
      deliverableId: scope.deliverable.id,
      timer: active,
      target: {
        id: active.taskId ?? scope.deliverable.id,
        kind: active.taskId ? 'task' : 'deliverable',
        label: active.taskId ? taskTitle ?? active.description ?? scope.deliverable.title : scope.deliverable.title,
        clientApproved: serverDeliverable?.status === 'approved',
      },
    });
  }

  async function confirmStop() {
    if (!pending || step !== 2 || finalize.isPending) return;
    setFinalizationError('');
    try {
      await finalize.mutateAsync({
        ...pending.timer,
        deliverableName: scope?.deliverable.title,
        taskName: pending.target.kind === 'task' ? pending.target.label : null,
      });
      show(`${pending.target.kind === 'task' ? 'Subtarefa' : 'Execução do entregável'} finalizada. Novas horas estão bloqueadas.`);
      await onChanged();
    } catch (error) {
      setFinalizationError(errorMessage(error, 'Não foi possível finalizar a execução.'));
    }
  }

  return {
    enabled: Boolean(scope && user?.id),
    canStart: Boolean(serverDeliverable && !context.error),
    error: context.error ? errorMessage(context.error, 'Não foi possível consultar o cronômetro.') : undefined,
    companyTimer,
    timer,
    workLocked,
    taskLocked,
    busy,
    notice: notice?.id === deliverableId ? notice : undefined,
    start,
    pause,
    requestStop,
    explainCompanyTimer: () => show('Só é possível um cronômetro por empresa. Pare o que está ligado — ele aparece no topo da tela — para iniciar outro neste entregável.'),
    dialog: {
      target: pending?.target ?? null,
      step,
      busy: finalize.isPending,
      error: finalizationError,
      onCancel: () => setConfirmation(undefined),
      onAdvance: () => setStep(2),
      onConfirm: () => void confirmStop(),
    },
  };
}

export type AdminProjectTimer = ReturnType<typeof useAdminProjectTimer>;
