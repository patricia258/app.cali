import { DialogForm } from '../../../components/ds/DialogForm';
import { Button } from '../../../components/ds/Button';
import { InlineNotice } from '../../../components/ds/InlineNotice';
import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Clock3, Pause, X } from 'lucide-react';
import { supabase } from '../../../api/supabase';
import type { PartnerWorkspace } from '../../../api/partner/workspace';
import { usePartnerTimer, type TimerRecovery } from './hooks/usePartnerTimer';
import './staff-timer.css';

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
    if (!supabase || !active || busy) return;
    setBusy(true);
    setError('');
    try {
      if (operation === 'present') {
        const { data, error } = await supabase.rpc('touch_partner_timer_v2', { p_timer_id: active.id, p_confirm_presence: true });
        if (error) throw new Error(error.message);
        setNotice(data ? 'Presença confirmada.' : 'O trecho foi pausado. Confira a justificativa.');
      } else {
        const { data, error } = await supabase.rpc('partner_stop_timer', { p_timer_id: active.id });
        if (error) throw new Error(error.message);
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
    if (!supabase || !editing || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.rpc('submit_partner_timer_recovery_v2', {
        p_timer_id: editing.id, p_justification: reason.trim(), p_minutes: Number(minutes),
      });
      if (error) throw new Error(error.message);
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
    {(active || recoveries.length > 0) && <div className="staff-timer-dock">
      {active && <div className="v2-staff-timers" aria-label="Cronômetro">
        <div className="v2-staff-timer">
          <Clock3 size={15} aria-hidden="true" /><div><strong>{formatClock(elapsed)}</strong><small>{active.description || label(active.companyId)}</small></div>
          <button type="button" disabled={busy} onClick={() => void updateActive('stop')}><Pause size={12} /> Pausar</button>
        </div>
      </div>}
      {warning && <div className="staff-timer-warning" role="status">
        <span>{remaining > 0 ? `Pausa em até ${remaining} min sem confirmação.` : 'Conferindo a pausa…'}</span>
        <button type="button" disabled={busy || !remaining} onClick={() => void updateActive('present')}>Continuo aqui</button>
      </div>}
      {recoveries.length > 0 && <div className="staff-timer-recoveries">
        {recoveries.map((recovery) => <Button key={recovery.id} type="button" variant="workflowSecondary" onClick={() => edit(recovery)}>
          Justificar pausa · {recovery.description || label(recovery.companyId)}
        </Button>)}
      </div>}
    </div>}
    {error && !editing && <InlineNotice as="p" className="v2-toast" role="alert">{error}</InlineNotice>}
    {notice && <InlineNotice as="p" tone="success" className="v2-toast" role="status">{notice}</InlineNotice>}
    {editing && createPortal(<div className="wf-overlay"><DialogForm className="wf-modal v2-staff-form"
      aria-label="Justificar pausa do cronômetro" onSubmit={submit}>
      <header><h2>Justificar pausa do cronômetro</h2>
        <button type="button" disabled={busy} aria-label="Fechar" onClick={() => setEditing(null)}><X size={16} /></button></header>
      <div className="v2-staff-body">
        <p>{editing.description || label(editing.companyId)} · trecho preservado de {formatClock(editing.seconds)}</p>
        <label>Minutos para aprovação<input type="number" value={minutes} min={1} max={1440} required
          onChange={(event) => setMinutes(event.target.value)} /></label>
        <label>Justificativa<textarea value={reason} minLength={10} maxLength={1500} required
          onChange={(event) => setReason(event.target.value)} /></label>
        {error && <InlineNotice as="p" role="alert">{error}</InlineNotice>}
      </div>
      <footer><Button variant="workflowSecondary" type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button>
        <Button variant="workflowPrimary" type="submit" disabled={busy || reason.trim().length < 10}>Enviar para aprovação</Button></footer>
    </DialogForm></div>, document.body)}
  </>;
}
