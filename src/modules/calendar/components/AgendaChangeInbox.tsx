import './calendar-dialog-motion.css';
import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, X } from 'lucide-react';
import type { AgendaChangeRequest } from '../../../api/calendar/changes';
import { DialogFrame } from '../../../components/ds/DialogFrame';
import { useAgendaChangeDecision } from '../hooks/useAgendaChangeDecision';
import { useAgendaChangeInbox } from '../hooks/useAgendaChangeInbox';

const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const entryButtonClass = 'tw:inline-flex tw:h-auto tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-solid tw:border-[#ead9ce] tw:bg-white tw:px-3 tw:py-2.5 tw:text-xs! tw:font-semibold! tw:text-[#603144] tw:shadow-none';
const formButtonClass = 'tw:w-max tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:border-cali-gold tw:px-3 tw:py-2 tw:disabled:cursor-default tw:disabled:opacity-60';
const optionClass = 'tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:p-2.5';

export function AgendaChangeInbox({ onDecision }: { onDecision: () => void }) {
  const { data, refetch } = useAgendaChangeInbox();
  const { mutateAsync, isPending: busy } = useAgendaChangeDecision();
  const [active, setActive] = useState<AgendaChangeRequest | null>(null);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState('');
  const [approve, setApprove] = useState(true);
  const [slot, setSlot] = useState(0);
  const [error, setError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const pending = data?.requests.filter(row => row.status === 'pending') ?? [];

  function openCurrent() {
    setActive(pending[index % pending.length]);
    setNote('');
    setApprove(true);
    setSlot(0);
    setError('');
  }

  async function decide(event: FormEvent) {
    event.preventDefault();
    if (!active || busy) return;
    setError('');
    try {
      const sync = await mutateAsync({ id: active.id, approve, note, slot });
      setSyncWarning(sync === 'pending'
        ? 'Decisão salva no Workspace. A sincronização com o Google ficou pendente.'
        : sync === 'disconnected' ? 'Decisão salva no Workspace. Conecte a agenda do Google para sincronizar.' : '');
      setActive(null);
      setNote('');
      await refetch();
      onDecision();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível salvar a decisão.');
    }
  }

  return (
    <div className="tw:inline-flex tw:items-center tw:gap-1.5">
      <button type="button" className={`${entryButtonClass} tw:disabled:cursor-default tw:disabled:opacity-70`} disabled={!pending.length}
        title={pending.length ? `${pending.length} pedido(s) aguardando análise` : 'Nenhum pedido pendente'} onClick={openCurrent}>
        <CalendarClock size={17} /> Alterações de reuniões
        {pending.length > 0 && <b className="tw:grid tw:h-5 tw:min-w-5 tw:place-items-center tw:rounded-full tw:bg-cali-gold tw:text-[0.6875rem] tw:text-[#25151c]">{pending.length}</b>}
      </button>
      {pending.length > 1 && <span className="tw:flex tw:items-center tw:gap-2.5">
        <button type="button" aria-label="Pedido anterior" className={entryButtonClass} onClick={() => setIndex((index - 1 + pending.length) % pending.length)}>‹</button>
        <small>{index % pending.length + 1}/{pending.length}</small>
        <button type="button" aria-label="Próximo pedido" className={entryButtonClass} onClick={() => setIndex((index + 1) % pending.length)}>›</button>
      </span>}
      {syncWarning && <p role="status" className="tw:text-cali-caption tw:text-cali-text">{syncWarning}</p>}
      {active && createPortal(
        <div className="tw:fixed tw:inset-0 tw:z-12200 tw:grid tw:place-items-center tw:bg-[#211017aa] tw:p-4 tw:backdrop-blur-sm"
          onMouseDown={event => { if (event.currentTarget === event.target && !busy) setActive(null); }}>
          <DialogFrame aria-labelledby="agenda-admin-change-title" className="tw:max-h-[calc(100dvh-1.875rem)] tw:w-[min(35.625rem,100%)] tw:overflow-auto tw:rounded-2xl tw:border tw:border-solid tw:border-cali-gold tw:bg-cali-surface tw:text-cali-text tw:motion-safe:animate-[calendarDialogRise_0.3s_ease_both]">
            <header className="tw:flex tw:justify-between tw:bg-cali-brand tw:p-5 tw:text-white">
              <div><small className="tw:text-[#edce8d]">PEDIDO DO CLIENTE</small><h2 id="agenda-admin-change-title" className="tw:mt-1.5! tw:mb-0! tw:text-white">{active.action === 'cancel' ? 'Cancelar reunião' : 'Reagendar reunião'}</h2></div>
              <button type="button" className="tw:rounded-md tw:border tw:border-solid tw:border-white/45 tw:bg-transparent tw:text-white"
                disabled={busy} onClick={() => setActive(null)} aria-label="Fechar"><X size={18} /></button>
            </header>
            <form onSubmit={decide} className="tw:grid tw:gap-3 tw:p-5">
              <strong>{data?.companies[active.company_id]} · {data?.titles[active.event_id]}</strong>
              <p className="tw:m-0! tw:leading-[1.45]">Original: {date.format(new Date(active.original_starts_at))}</p>
              <p className="tw:m-0! tw:leading-[1.45]">Motivo do cliente: {active.reason}</p>
              {active.action === 'reschedule' && <div className="tw:grid tw:gap-2">{active.slots.map((option, index) => (
                <label className={optionClass} key={option.startsAt}><input type="radio" name="option" checked={slot === index} onChange={() => setSlot(index)} />{date.format(new Date(option.startsAt))}</label>
              ))}</div>}
              <div className="tw:grid tw:gap-2">
                <label className={optionClass}><input type="radio" name="decision" checked={approve} onChange={() => setApprove(true)} />Confirmar pedido</label>
                <label className={optionClass}><input type="radio" name="decision" checked={!approve} onChange={() => setApprove(false)} />Recusar pedido</label>
              </div>
              <label className="tw:grid tw:gap-1.5">Resposta ao cliente
                <textarea className="tw:box-border tw:min-h-[5.625rem] tw:w-full tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-surface tw:p-2.5 tw:text-cali-text" minLength={5} required value={note}
                  onChange={event => setNote(event.target.value)} placeholder="Explique sua decisão e eventual condição de cobrança." />
              </label>
              {error && <p role="alert">{error}</p>}
              <div className="tw:flex tw:justify-end tw:gap-2">
                <button type="button" className={`${formButtonClass} tw:bg-transparent tw:text-cali-text`} disabled={busy} onClick={() => setActive(null)}>Voltar</button>
                <button type="submit" className={`${formButtonClass} tw:bg-cali-brand tw:text-white`} disabled={busy}>{busy ? 'Salvando…' : 'Enviar resposta'}</button>
              </div>
            </form>
          </DialogFrame>
        </div>, document.body)}
    </div>
  );
}
