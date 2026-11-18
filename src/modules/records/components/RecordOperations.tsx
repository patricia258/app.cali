import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { confirmAction } from '../../../components/feedback/workspaceDialogs';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useMarkRecordOpened } from '../hooks/useMarkRecordOpened';
import { useRecordOperations } from '../hooks/useRecordOperations';
import { useDeleteUnopenedRecord } from '../hooks/useDeleteUnopenedRecord';
import { useRecordTimerData } from '../hooks/useRecordTimerData';
import { useRecordTimerAction } from '../hooks/useRecordTimerAction';

type RecordOperationsProps = {
  actorId?: string;
  recordId: string;
  protocol: string;
  role: 'admin' | 'client';
  onDeleted?: () => void;
};

export function RecordOperations({ actorId, recordId, protocol, role, onDeleted }: RecordOperationsProps) {
  const { data: record } = useRecordOperations(role, actorId, recordId, protocol);
  const { mutate: markOpened } = useMarkRecordOpened(actorId, recordId, protocol);
  const needsReadReceipt = role === 'admin' && Boolean(record && !record.first_admin_opened_at);
  useEffect(() => {
    if (needsReadReceipt) markOpened();
  }, [markOpened, needsReadReceipt]);

  if (!record) return null;
  if (role === 'admin') {
    return <RecordTimer actorId={actorId} recordId={recordId} locked={['completed', 'cancelled'].includes(record.workflow_status ?? '')} />;
  }
  return onDeleted && record.source_actor === 'client' && record.created_by === actorId &&
    record.workflow_status === 'open' && !record.first_admin_opened_at
    ? <UnopenedRecordRemoval actorId={actorId} recordId={recordId} protocol={protocol} onDeleted={onDeleted} />
    : null;
}

function UnopenedRecordRemoval({ actorId, recordId, protocol, onDeleted }: { actorId?: string; recordId: string; protocol: string; onDeleted: () => void }) {
  const { mutate, isPending, error } = useDeleteUnopenedRecord(actorId, recordId, protocol, onDeleted);
  async function confirmRemoval() {
    if (await confirmAction('Excluir esta solicitação? Isso só é possível porque a CALI ainda não abriu o atendimento.')) mutate();
  }
  return (
    <div className="tw:flex tw:items-center tw:justify-between tw:gap-5.5 tw:rounded-2xl tw:border tw:border-solid tw:border-[color-mix(in_srgb,var(--cali-color-gold-accent)_30%,var(--theme-line))] tw:bg-[color-mix(in_srgb,var(--cali-color-gold-accent)_6%,var(--theme-surface))] tw:px-4.5 tw:py-3.5 tw:[@media(max-width:720px)]:flex-col tw:[@media(max-width:720px)]:items-stretch">
      <div className="tw:grid tw:gap-0.5">
        <strong className="tw:text-sm tw:text-cali-text">Ainda não foi aberta pela CALI</strong>
        <span className="tw:text-xs tw:leading-[1.45] tw:text-cali-muted">Você pode excluir esta solicitação enquanto ela não tiver sido visualizada pela Administração CALI.</span>
      </div>
      <button type="button" className="tw:min-h-[2.92rem] tw:flex-none tw:rounded-xl tw:border tw:border-solid tw:border-cali-red-accent/34 tw:bg-cali-red-accent/7 tw:px-3.5 tw:text-cali-detail tw:font-extrabold tw:text-cali-red-accent tw:hover:bg-cali-red-accent/12 tw:workspace-night:text-cali-burgundy-soft tw:[@media(max-width:720px)]:w-full" disabled={isPending} onClick={() => void confirmRemoval()}>Excluir solicitação</button>
      {error && <InlineNotice>{error.message}</InlineNotice>}
    </div>
  );
}

function formatMinutes(total: number) {
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`;
}

function RecordTimer({ actorId, recordId, locked }: { actorId?: string; recordId: string; locked: boolean }) {
  const { data } = useRecordTimerData(actorId, recordId);
  const { mutate, isPending, error } = useRecordTimerAction(recordId);
  const [now, setNow] = useState(Date.now);
  const [shortSession, setShortSession] = useState(false);
  const timer = data?.timer;
  useEffect(() => {
    if (!timer) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [timer]);
  useEffect(() => {
    if (!shortSession) return;
    const timeout = window.setTimeout(() => setShortSession(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [shortSession]);

  if (!data) return null;
  const total = formatMinutes(data.total);
  const sessions = `${data.sessions} ${data.sessions === 1 ? 'sessão' : 'sessões'}`;
  const elapsed = timer ? Math.max(0, Math.floor((now - new Date(timer.started_at).getTime()) / 1000) - Number(timer.paused_seconds || 0)) : 0;
  const clock = [Math.floor(elapsed / 3600), Math.floor((elapsed % 3600) / 60), elapsed % 60].map((value) => String(value).padStart(2, '0')).join(':');

  const action = timer ? 'Pausar e registrar' : locked ? 'Atendimento encerrado' : 'Iniciar acompanhamento';
  const indicator = timer ? <Pause size={10} fill="currentColor" aria-hidden="true" /> : <Play size={10} fill="currentColor" aria-hidden="true" />;

  return (
    <div className="tw:absolute tw:top-7.5 tw:right-20.5 tw:z-8 tw:inline-flex tw:w-auto tw:items-center">
      <div className={`tw:inline-flex tw:h-11 tw:flex-row-reverse tw:items-center tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:bg-cali-neutral-surface ${timer ? 'tw:border-cali-brand' : 'tw:border-cali-line-strong'}`}>
        <b title={`${total} registrados em ${sessions}.`} className="tw:inline-flex tw:h-full tw:min-w-[5.85rem] tw:flex-col tw:items-start tw:justify-center tw:gap-px tw:whitespace-nowrap tw:px-3.5 tw:text-cali-body tw:leading-[1.1] tw:font-bold tw:text-cali-brand tw:tabular-nums">
          <span className="tw:text-cali-micro tw:tracking-[.08em] tw:text-cali-muted tw:uppercase">{timer ? 'Sessão atual' : 'Total'}</span>
          {timer ? clock : total}
        </b>
        <button
          type="button"
          aria-label={action}
          className="tw:inline-flex tw:h-full tw:min-h-0 tw:items-center tw:gap-2 tw:whitespace-nowrap tw:rounded-none tw:border-0 tw:bg-cali-brand tw:px-3.5 tw:text-sm tw:font-bold tw:text-cali-neutral-surface tw:disabled:cursor-default tw:disabled:bg-cali-surface-muted tw:disabled:text-cali-muted tw:disabled:opacity-[.52]"
          disabled={isPending || (!timer && locked)}
          onClick={() => mutate(timer?.id ?? null, { onSuccess: () => setShortSession(Boolean(timer && elapsed < 30)) })}
        >
          {!locked && !isPending && indicator}
          {isPending ? 'Aguarde…' : timer ? 'Pausar' : locked ? 'Encerrado' : 'Iniciar'}
        </button>
      </div>
      {shortSession && <span role="status" className="tw:absolute tw:top-[calc(100%+.46rem)] tw:right-0 tw:z-9 tw:whitespace-nowrap tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-gold-surface tw:px-3 tw:py-2 tw:text-xs tw:font-semibold tw:text-cali-warning tw:shadow-[0_.62rem_1.85rem_rgb(var(--cali-rgb-red-inverse)/0.1216)]">Sessão com menos de 30 segundos: não foi registrada.</span>}
      {error && <InlineNotice>{error.message}</InlineNotice>}
    </div>
  );
}
