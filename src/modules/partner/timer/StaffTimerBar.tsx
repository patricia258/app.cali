import { StaffDialogBody, StaffDialogFields, StaffDialogFooter, StaffDialogForm, StaffDialogHeader } from '../../../components/workspace/StaffDialog';
import { Button } from '../../../components/ds/Button';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Pause } from 'lucide-react';
import { stopPartnerTimer, submitPartnerTimerRecovery, touchPartnerTimer, type TimerRecovery } from '../../../api/partner/timer';
import type { PartnerWorkspace } from '../../../api/partner/workspace';
import { usePartnerTimer } from './hooks/usePartnerTimer';

function formatClock(seconds: number) {
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
}

export function StaffTimerBar({ me }: { me: PartnerWorkspace }) {
  const { active, recoveries, now, refresh } = usePartnerTimer();
  const [editing, setEditing] = useState<TimerRecovery | null>(null);
  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function changed() {
    window.dispatchEvent(new Event('cali-staff-timer-changed'));
  }

  async function updateActive(operation: 'stop' | 'present') {
    if (!active || busy) return;
    setBusy(true);
    setError('');
    try {
      if (operation === 'present') {
        const data = await touchPartnerTimer(active.id, true);
        setNotice(data ? 'Presença confirmada.' : 'O trecho foi pausado. Confira a justificativa.');
      } else {
        const data = await stopPartnerTimer(active.id);
        setNotice(data?.recovery_required ? 'Trecho pausado. Envie a justificativa.'
          : data?.discarded ? 'Sessão com menos de 30 segundos.' : 'Tempo enviado para aprovação da Patrícia.');
      }
      await refresh();
      changed();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o cronômetro.');
    } finally { setBusy(false); }
  }

  function edit(recovery: TimerRecovery) {
    setEditing(recovery);
    setReason('');
    setError('');
    setMinutes(recovery.minutes > 0 ? String(recovery.minutes) : '');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setError('');
    try {
      await submitPartnerTimerRecovery(editing.id, reason, Number(minutes));
      setEditing(null);
      setNotice('Justificativa enviada para aprovação da Patrícia.');
      await refresh();
      changed();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a justificativa.');
    } finally { setBusy(false); }
  }

  const warning = active?.status === 'active' && now >= Date.parse(active.warningAt);
  const remaining = active ? Math.max(0, Math.ceil((Date.parse(active.pauseAt) - now) / 60_000)) : 0;
  const elapsed = active ? Math.max(0, Math.floor((Math.min(now, Date.parse(active.pauseAt)) - Date.parse(active.startedAt)) / 1000)
    - (active.pausedSeconds || 0)) : 0;
  const label = (company: string) => me.companies.find((item) => item.id === company)?.display_name ?? 'Atuação CALI';

  return <>
    {(active || recoveries.length > 0) && (
      <div
        data-staff-timer-dock=""
        className="tw:flex tw:items-center tw:gap-2.5 tw:[@media(max-width:46.25rem)]:fixed tw:[@media(max-width:46.25rem)]:inset-x-[.92rem] tw:[@media(max-width:46.25rem)]:bottom-[max(.92rem,env(safe-area-inset-bottom))] tw:[@media(max-width:46.25rem)]:z-70 tw:[@media(max-width:46.25rem)]:grid tw:[@media(max-width:46.25rem)]:gap-2 tw:[@media(max-width:46.25rem)]:rounded-2xl tw:[@media(max-width:46.25rem)]:border tw:[@media(max-width:46.25rem)]:border-solid tw:[@media(max-width:46.25rem)]:border-cali-line tw:[@media(max-width:46.25rem)]:bg-cali-surface tw:[@media(max-width:46.25rem)]:p-2 tw:[@media(max-width:46.25rem)]:shadow-[0_.23rem_.92rem_#0000001f]"
      >
        {active && (
          <div className="tw:flex tw:min-w-0 tw:items-center" aria-label="Cronômetro">
            <div className="tw:flex tw:h-12 tw:min-w-0 tw:items-center tw:justify-between tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-[#cfe3d6] tw:bg-[#f1f8f3] tw:pr-2 tw:pl-3.5 tw:text-[#2c5a3f] tw:[@media(max-width:46.25rem)]:w-full tw:[@media(max-width:46.25rem)]:justify-start">
              <Clock3 size={15} aria-hidden="true" />
              <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1 tw:leading-[1.15]">
                <strong className="tw:text-[1rem] tw:leading-[1.1] tw:text-[#234a33] tw:tabular-nums">{formatClock(elapsed)}</strong>
                <small className="tw:max-w-[13.85rem] tw:truncate tw:text-[.77rem] tw:leading-[inherit] tw:font-medium tw:text-[#5d7a68] tw:[@media(max-width:53.125rem)]:hidden">{active.description || label(active.companyId)}</small>
              </div>
              <Button className="tw:inline-flex tw:h-[2.15rem] tw:flex-none tw:cursor-pointer tw:items-center tw:gap-1.5 tw:rounded-lg tw:border-0 tw:bg-[#356448] tw:px-3 tw:text-[.846rem] tw:leading-[inherit] tw:font-bold tw:whitespace-nowrap tw:text-white tw:[@media(max-width:46.25rem)]:ml-auto" variant="unstyled" type="button" disabled={busy} onClick={() => void updateActive('stop')}><Pause size={12} /> Pausar</Button>
            </div>
          </div>
        )}
        {warning && (
          <div className="tw:fixed tw:right-[1.385rem] tw:bottom-[1.385rem] tw:z-70 tw:flex tw:flex-wrap tw:items-center tw:gap-2.5 tw:rounded-xl tw:border tw:border-solid tw:border-cali-line tw:bg-(--theme-surface-soft) tw:px-2.5 tw:py-1.5 tw:text-[.8rem] tw:leading-[inherit] tw:text-cali-text tw:shadow-[0_.23rem_.92rem_#0000001f] tw:[@media(max-width:46.25rem)]:static tw:[@media(max-width:46.25rem)]:justify-between tw:[@media(max-width:46.25rem)]:shadow-none" role="status">
            <span>{remaining > 0 ? `Pausa em até ${remaining} min sem confirmação.` : 'Conferindo a pausa…'}</span>
            <Button className="tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-current tw:bg-cali-surface tw:px-2.5 tw:py-1 tw:text-[.8rem] tw:leading-[inherit] tw:font-bold tw:text-cali-accent" variant="unstyled" type="button" disabled={busy || !remaining} onClick={() => void updateActive('present')}>Continuo aqui</Button>
          </div>
        )}
        {recoveries.length > 0 && <div className="tw:flex tw:max-h-[3.23rem] tw:flex-wrap tw:items-center tw:gap-2.5 tw:overflow-auto tw:text-[.8rem] tw:leading-[inherit]">
          {recoveries.map((recovery) => <Button key={recovery.id} type="button" variant="workflowSecondary" onClick={() => edit(recovery)}>
            Justificar pausa · {recovery.description || label(recovery.companyId)}
          </Button>)}
        </div>}
      </div>
    )}
    {error && !editing && <InlineNotice as="p" className="v2-toast" role="alert">{error}</InlineNotice>}
    {notice && <InlineNotice as="p" tone="success" className="v2-toast" role="status">{notice}</InlineNotice>}
    {editing && createPortal(<div className="wf-overlay"><StaffDialogForm
      aria-label="Justificar pausa do cronômetro" onSubmit={submit}>
      <StaffDialogHeader onClose={() => setEditing(null)} disabled={busy}><h2>Justificar pausa do cronômetro</h2></StaffDialogHeader>
      <StaffDialogBody>
        <p>{editing.description || label(editing.companyId)} · trecho preservado de {formatClock(editing.seconds)}</p>
        <StaffDialogFields columns={1}><label>Minutos para aprovação<input type="number" value={minutes} min={1} max={1440} required
          onChange={(event) => setMinutes(event.target.value)} /></label>
        <label>Justificativa<textarea value={reason} minLength={10} maxLength={1500} required
          onChange={(event) => setReason(event.target.value)} /></label></StaffDialogFields>
        {error && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
      </StaffDialogBody>
      <StaffDialogFooter><Button variant="workflowSecondary" type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button>
        <Button variant="workflowPrimary" type="submit" disabled={busy || reason.trim().length < 10}>Enviar para aprovação</Button></StaffDialogFooter>
    </StaffDialogForm></div>, document.body)}
  </>;
}
